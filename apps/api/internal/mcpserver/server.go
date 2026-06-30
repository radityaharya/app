package mcpserver

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/radityaharya/commuter/internal/store"
	commutesync "github.com/radityaharya/commuter/internal/sync"
)

// New builds and returns the MCP HTTP handler.
func New(db *store.Store, syncer *commutesync.Syncer) http.Handler {
	srv := mcp.NewServer(&mcp.Implementation{
		Name:    "commuter-krl",
		Version: "0.2.0",
	}, nil)

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_stations",
		Description: "List all KRL Jabodetabek stations in the cache.",
	}, listStations(db))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "search_stations",
		Description: "Search KRL stations by name or ID. Returns stations whose name or ID contains the query (case-insensitive).",
	}, searchStations(db))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_schedule",
		Description: "Get upcoming departures for a single station. Use plan_trip instead if you need trains between two stations.",
	}, getSchedule(db, syncer))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "plan_trip",
		Description: "Find trains from one station to another. Accepts station IDs or partial names. Returns upcoming direct departures filtered to trains that terminate at (or pass through) the destination. Use this instead of combining search_stations + get_schedule manually.",
	}, planTrip(db, syncer))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_next_departure",
		Description: "Get the single next train from one station to another. Fastest way to answer 'when is the next train from X to Y?'",
	}, getNextDeparture(db, syncer))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_lines",
		Description: "List all KRL lines and their terminus pairs. Use this to understand which line serves a route before fetching a schedule.",
	}, listLines(db))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_station_board",
		Description: "Get a departure board for a station: upcoming trains grouped by line and destination. One call gives a full picture of a station.",
	}, getStationBoard(db, syncer))

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_schedule_batch",
		Description: "Get schedules for multiple stations in a single call. Returns up to `limit` upcoming departures per station.",
	}, getScheduleBatch(db, syncer))

	handler := mcp.NewStreamableHTTPHandler(func(_ *http.Request) *mcp.Server {
		return srv
	}, nil)

	return handler
}

// ── Shared types ──────────────────────────────────────────────────────────────

type stationOut struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type departureOut struct {
	TrainID     string `json:"train_id"`
	Line        string `json:"line"`
	Route       string `json:"route"`
	Destination string `json:"destination"`
	DepartsAt   string `json:"departs_at"`
	ArrivesAt   string `json:"arrives_at"`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// resolveStation tries an exact ID lookup first, then falls back to a
// case-insensitive substring match on name.
func resolveStation(db *store.Store, query string) (*store.Station, error) {
	if s, err := db.StationByID(strings.ToUpper(query)); err == nil && s != nil {
		return s, nil
	}
	all, err := db.AllStations()
	if err != nil {
		return nil, err
	}
	q := strings.ToUpper(query)
	for _, s := range all {
		if strings.Contains(strings.ToUpper(s.Name), q) || strings.Contains(strings.ToUpper(s.ID), q) {
			return &s, nil
		}
	}
	return nil, fmt.Errorf("station not found: %q", query)
}

// ensureSchedule fetches live data if the cache is stale for today.
func ensureSchedule(ctx context.Context, db *store.Store, syncer *commutesync.Syncer, stationID string) {
	synced, err := db.SchedulesSyncedToday(stationID)
	if err != nil {
		slog.Warn("mcp: sync check failed", "station", stationID, "err", err)
	}
	if !synced {
		slog.Info("mcp: fetching live schedule", "station", stationID)
		if err := syncer.SyncScheduleForStation(ctx, stationID); err != nil {
			slog.Warn("mcp: live fetch failed, using stale cache", "station", stationID, "err", err)
		}
	}
}

// nameMap builds an id→name lookup from the full station list.
func nameMap(db *store.Store) map[string]string {
	all, _ := db.AllStations()
	m := make(map[string]string, len(all))
	for _, s := range all {
		m[s.ID] = s.Name
	}
	return m
}

// toDepartureOut converts a store.Schedule to departureOut, resolving the
// destination name via the provided lookup.
func toDepartureOut(sc store.Schedule, names map[string]string) departureOut {
	dest := names[sc.StationDestinationID]
	if dest == "" {
		dest = sc.StationDestinationID
	}
	return departureOut{
		TrainID:     sc.TrainID,
		Line:        sc.Line,
		Route:       sc.Route,
		Destination: dest,
		DepartsAt:   sc.DepartsAt.Format("15:04"),
		ArrivesAt:   sc.ArrivesAt.Format("15:04"),
	}
}

// upcomingFrom filters schedules to those departing after now, up to limit.
func upcomingFrom(schedules []store.Schedule, now time.Time, limit int) []store.Schedule {
	out := make([]store.Schedule, 0, limit)
	for _, sc := range schedules {
		if sc.DepartsAt.Before(now) {
			continue
		}
		out = append(out, sc)
		if len(out) >= limit {
			break
		}
	}
	return out
}

// ── Tool: list_stations ───────────────────────────────────────────────────────

type listStationsIn struct{}

type listStationsOut struct {
	Stations []stationOut `json:"stations"`
	Count    int          `json:"count"`
}

func listStations(db *store.Store) mcp.ToolHandlerFor[listStationsIn, listStationsOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, _ listStationsIn) (*mcp.CallToolResult, listStationsOut, error) {
		stations, err := db.AllStations()
		if err != nil {
			return nil, listStationsOut{}, fmt.Errorf("list_stations: %w", err)
		}
		out := listStationsOut{Stations: make([]stationOut, 0, len(stations)), Count: len(stations)}
		for _, s := range stations {
			out.Stations = append(out.Stations, stationOut{ID: s.ID, Name: s.Name, Type: s.Type})
		}
		return nil, out, nil
	}
}

// ── Tool: search_stations ─────────────────────────────────────────────────────

type searchStationsIn struct {
	Query string `json:"query"`
}

func searchStations(db *store.Store) mcp.ToolHandlerFor[searchStationsIn, listStationsOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in searchStationsIn) (*mcp.CallToolResult, listStationsOut, error) {
		if in.Query == "" {
			return nil, listStationsOut{}, fmt.Errorf("search_stations: query must not be empty")
		}
		stations, err := db.AllStations()
		if err != nil {
			return nil, listStationsOut{}, fmt.Errorf("search_stations: %w", err)
		}
		q := strings.ToUpper(in.Query)
		out := listStationsOut{Stations: []stationOut{}}
		for _, s := range stations {
			if strings.Contains(strings.ToUpper(s.Name), q) || strings.Contains(strings.ToUpper(s.ID), q) {
				out.Stations = append(out.Stations, stationOut{ID: s.ID, Name: s.Name, Type: s.Type})
			}
		}
		out.Count = len(out.Stations)
		return nil, out, nil
	}
}

// ── Tool: get_schedule ────────────────────────────────────────────────────────

type getScheduleIn struct {
	StationID string `json:"station_id"`
	Limit     int    `json:"limit,omitempty"`
}

type getScheduleOut struct {
	StationID   string         `json:"station_id"`
	StationName string         `json:"station_name"`
	AsOf        string         `json:"as_of"`
	Departures  []departureOut `json:"departures"`
	Count       int            `json:"count"`
}

func getSchedule(db *store.Store, syncer *commutesync.Syncer) mcp.ToolHandlerFor[getScheduleIn, getScheduleOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in getScheduleIn) (*mcp.CallToolResult, getScheduleOut, error) {
		if in.StationID == "" {
			return nil, getScheduleOut{}, fmt.Errorf("get_schedule: station_id is required")
		}
		id := strings.ToUpper(in.StationID)
		limit := in.Limit
		if limit <= 0 {
			limit = 20
		}

		ensureSchedule(ctx, db, syncer, id)

		schedules, err := db.SchedulesByStation(id)
		if err != nil {
			return nil, getScheduleOut{}, fmt.Errorf("get_schedule: %w", err)
		}

		stationName := id
		if s, err := db.StationByID(id); err == nil && s != nil {
			stationName = s.Name
		}

		names := nameMap(db)
		now := time.Now()
		upcoming := upcomingFrom(schedules, now, limit)
		deps := make([]departureOut, 0, len(upcoming))
		for _, sc := range upcoming {
			deps = append(deps, toDepartureOut(sc, names))
		}

		out := getScheduleOut{
			StationID:   id,
			StationName: stationName,
			AsOf:        now.Format(time.RFC3339),
			Departures:  deps,
			Count:       len(deps),
		}
		return nil, out, nil
	}
}

// ── Tool: plan_trip ───────────────────────────────────────────────────────────

type planTripIn struct {
	From  string `json:"from"`
	To    string `json:"to"`
	Limit int    `json:"limit,omitempty"`
}

type tripDepartureOut struct {
	departureOut
	BoardAt string `json:"board_at"`
}

type planTripOut struct {
	From       stationOut         `json:"from"`
	To         stationOut         `json:"to"`
	AsOf       string             `json:"as_of"`
	Departures []tripDepartureOut `json:"departures"`
	Count      int                `json:"count"`
}

func planTrip(db *store.Store, syncer *commutesync.Syncer) mcp.ToolHandlerFor[planTripIn, planTripOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in planTripIn) (*mcp.CallToolResult, planTripOut, error) {
		if in.From == "" || in.To == "" {
			return nil, planTripOut{}, fmt.Errorf("plan_trip: both from and to are required")
		}

		fromStation, err := resolveStation(db, in.From)
		if err != nil {
			return nil, planTripOut{}, fmt.Errorf("plan_trip: from: %w", err)
		}
		toStation, err := resolveStation(db, in.To)
		if err != nil {
			return nil, planTripOut{}, fmt.Errorf("plan_trip: to: %w", err)
		}

		limit := in.Limit
		if limit <= 0 {
			limit = 10
		}

		ensureSchedule(ctx, db, syncer, fromStation.ID)
		ensureSchedule(ctx, db, syncer, toStation.ID)

		fromSchedules, err := db.SchedulesByStation(fromStation.ID)
		if err != nil {
			return nil, planTripOut{}, fmt.Errorf("plan_trip: %w", err)
		}

		// Build a map of train_id → departure time at the destination station.
		// This handles intermediate stops: a train serving KBY→CSK will appear
		// in both stations' schedules even though its terminal is Rangkasbitung.
		toSchedules, err := db.SchedulesByStation(toStation.ID)
		if err != nil {
			return nil, planTripOut{}, fmt.Errorf("plan_trip: destination schedule: %w", err)
		}
		trainArrivesToDest := make(map[string]time.Time, len(toSchedules))
		for _, sc := range toSchedules {
			trainArrivesToDest[sc.TrainID] = sc.DepartsAt
		}

		names := nameMap(db)
		now := time.Now()

		var deps []tripDepartureOut
		for _, sc := range fromSchedules {
			if sc.DepartsAt.Before(now) {
				continue
			}
			// Accept if the train also stops at the destination after it leaves here.
			destDep, servesTo := trainArrivesToDest[sc.TrainID]
			if !servesTo || !sc.DepartsAt.Before(destDep) {
				continue
			}
			d := toDepartureOut(sc, names)
			deps = append(deps, tripDepartureOut{
				departureOut: d,
				BoardAt:      fromStation.Name,
			})
			if len(deps) >= limit {
				break
			}
		}

		out := planTripOut{
			From:       stationOut{ID: fromStation.ID, Name: fromStation.Name, Type: fromStation.Type},
			To:         stationOut{ID: toStation.ID, Name: toStation.Name, Type: toStation.Type},
			AsOf:       now.Format(time.RFC3339),
			Departures: deps,
			Count:      len(deps),
		}
		return nil, out, nil
	}
}

// ── Tool: get_next_departure ──────────────────────────────────────────────────

type nextDepartureIn struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type nextDepartureOut struct {
	From      stationOut    `json:"from"`
	To        stationOut    `json:"to"`
	Next      *departureOut `json:"next"`
	Found     bool          `json:"found"`
	AsOf      string        `json:"as_of"`
}

func getNextDeparture(db *store.Store, syncer *commutesync.Syncer) mcp.ToolHandlerFor[nextDepartureIn, nextDepartureOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in nextDepartureIn) (*mcp.CallToolResult, nextDepartureOut, error) {
		if in.From == "" || in.To == "" {
			return nil, nextDepartureOut{}, fmt.Errorf("get_next_departure: both from and to are required")
		}

		fromStation, err := resolveStation(db, in.From)
		if err != nil {
			return nil, nextDepartureOut{}, fmt.Errorf("get_next_departure: from: %w", err)
		}
		toStation, err := resolveStation(db, in.To)
		if err != nil {
			return nil, nextDepartureOut{}, fmt.Errorf("get_next_departure: to: %w", err)
		}

		ensureSchedule(ctx, db, syncer, fromStation.ID)
		ensureSchedule(ctx, db, syncer, toStation.ID)

		fromSchedules, err := db.SchedulesByStation(fromStation.ID)
		if err != nil {
			return nil, nextDepartureOut{}, fmt.Errorf("get_next_departure: %w", err)
		}

		toSchedules, err := db.SchedulesByStation(toStation.ID)
		if err != nil {
			return nil, nextDepartureOut{}, fmt.Errorf("get_next_departure: destination schedule: %w", err)
		}
		trainArrivesToDest := make(map[string]time.Time, len(toSchedules))
		for _, sc := range toSchedules {
			trainArrivesToDest[sc.TrainID] = sc.DepartsAt
		}

		names := nameMap(db)
		now := time.Now()

		out := nextDepartureOut{
			From:  stationOut{ID: fromStation.ID, Name: fromStation.Name, Type: fromStation.Type},
			To:    stationOut{ID: toStation.ID, Name: toStation.Name, Type: toStation.Type},
			AsOf:  now.Format(time.RFC3339),
			Found: false,
		}

		for _, sc := range fromSchedules {
			if sc.DepartsAt.Before(now) {
				continue
			}
			destDep, servesTo := trainArrivesToDest[sc.TrainID]
			if !servesTo || !sc.DepartsAt.Before(destDep) {
				continue
			}
			d := toDepartureOut(sc, names)
			out.Next = &d
			out.Found = true
			break
		}

		return nil, out, nil
	}
}

// ── Tool: list_lines ──────────────────────────────────────────────────────────

type listLinesIn struct{}

type lineOut struct {
	Name     string   `json:"name"`
	Terminus []string `json:"terminus_pairs"`
}

type listLinesOut struct {
	Lines []lineOut `json:"lines"`
	Count int       `json:"count"`
}

func listLines(db *store.Store) mcp.ToolHandlerFor[listLinesIn, listLinesOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, _ listLinesIn) (*mcp.CallToolResult, listLinesOut, error) {
		pairs, err := db.DistinctLinesAndRoutes()
		if err != nil {
			return nil, listLinesOut{}, fmt.Errorf("list_lines: %w", err)
		}

		// Group routes by line name, deduplicating routes.
		order := []string{}
		grouped := map[string]map[string]struct{}{}
		for _, p := range pairs {
			if _, ok := grouped[p.Line]; !ok {
				order = append(order, p.Line)
				grouped[p.Line] = map[string]struct{}{}
			}
			grouped[p.Line][p.Route] = struct{}{}
		}

		lines := make([]lineOut, 0, len(order))
		for _, name := range order {
			routes := make([]string, 0, len(grouped[name]))
			for r := range grouped[name] {
				routes = append(routes, r)
			}
			lines = append(lines, lineOut{Name: name, Terminus: routes})
		}

		return nil, listLinesOut{Lines: lines, Count: len(lines)}, nil
	}
}

// ── Tool: get_station_board ───────────────────────────────────────────────────

type stationBoardIn struct {
	StationID string `json:"station_id"`
	Limit     int    `json:"limit,omitempty"`
}

type boardGroupOut struct {
	Line       string         `json:"line"`
	Departures []departureOut `json:"departures"`
}

type stationBoardOut struct {
	StationID   string          `json:"station_id"`
	StationName string          `json:"station_name"`
	AsOf        string          `json:"as_of"`
	ByLine      []boardGroupOut `json:"by_line"`
	TotalCount  int             `json:"total_count"`
}

func getStationBoard(db *store.Store, syncer *commutesync.Syncer) mcp.ToolHandlerFor[stationBoardIn, stationBoardOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in stationBoardIn) (*mcp.CallToolResult, stationBoardOut, error) {
		if in.StationID == "" {
			return nil, stationBoardOut{}, fmt.Errorf("get_station_board: station_id is required")
		}
		id := strings.ToUpper(in.StationID)
		perLine := in.Limit
		if perLine <= 0 {
			perLine = 5
		}

		ensureSchedule(ctx, db, syncer, id)

		schedules, err := db.SchedulesByStation(id)
		if err != nil {
			return nil, stationBoardOut{}, fmt.Errorf("get_station_board: %w", err)
		}

		stationName := id
		if s, err := db.StationByID(id); err == nil && s != nil {
			stationName = s.Name
		}

		names := nameMap(db)
		now := time.Now()

		// Group by line, keeping insertion order.
		lineOrder := []string{}
		byLine := map[string][]departureOut{}
		for _, sc := range schedules {
			if sc.DepartsAt.Before(now) {
				continue
			}
			if len(byLine[sc.Line]) >= perLine {
				continue
			}
			if _, seen := byLine[sc.Line]; !seen {
				lineOrder = append(lineOrder, sc.Line)
			}
			byLine[sc.Line] = append(byLine[sc.Line], toDepartureOut(sc, names))
		}

		groups := make([]boardGroupOut, 0, len(lineOrder))
		total := 0
		for _, line := range lineOrder {
			deps := byLine[line]
			groups = append(groups, boardGroupOut{Line: line, Departures: deps})
			total += len(deps)
		}

		out := stationBoardOut{
			StationID:   id,
			StationName: stationName,
			AsOf:        now.Format(time.RFC3339),
			ByLine:      groups,
			TotalCount:  total,
		}
		return nil, out, nil
	}
}

// ── Tool: get_schedule_batch ──────────────────────────────────────────────────

type scheduleBatchIn struct {
	StationIDs []string `json:"station_ids"`
	Limit      int      `json:"limit,omitempty"`
}

type batchEntryOut struct {
	StationID   string         `json:"station_id"`
	StationName string         `json:"station_name"`
	Departures  []departureOut `json:"departures"`
	Count       int            `json:"count"`
	Error       string         `json:"error,omitempty"`
}

type scheduleBatchOut struct {
	Stations []batchEntryOut `json:"stations"`
	AsOf     string          `json:"as_of"`
}

func getScheduleBatch(db *store.Store, syncer *commutesync.Syncer) mcp.ToolHandlerFor[scheduleBatchIn, scheduleBatchOut] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in scheduleBatchIn) (*mcp.CallToolResult, scheduleBatchOut, error) {
		if len(in.StationIDs) == 0 {
			return nil, scheduleBatchOut{}, fmt.Errorf("get_schedule_batch: station_ids must not be empty")
		}
		if len(in.StationIDs) > 10 {
			return nil, scheduleBatchOut{}, fmt.Errorf("get_schedule_batch: max 10 stations per call")
		}
		limit := in.Limit
		if limit <= 0 {
			limit = 10
		}

		names := nameMap(db)
		now := time.Now()
		entries := make([]batchEntryOut, 0, len(in.StationIDs))

		for _, rawID := range in.StationIDs {
			id := strings.ToUpper(rawID)

			ensureSchedule(ctx, db, syncer, id)

			stationName := id
			if s, err := db.StationByID(id); err == nil && s != nil {
				stationName = s.Name
			}

			schedules, err := db.SchedulesByStation(id)
			if err != nil {
				entries = append(entries, batchEntryOut{
					StationID:   id,
					StationName: stationName,
					Error:       err.Error(),
				})
				continue
			}

			upcoming := upcomingFrom(schedules, now, limit)
			deps := make([]departureOut, 0, len(upcoming))
			for _, sc := range upcoming {
				deps = append(deps, toDepartureOut(sc, names))
			}

			entries = append(entries, batchEntryOut{
				StationID:   id,
				StationName: stationName,
				Departures:  deps,
				Count:       len(deps),
			})
		}

		return nil, scheduleBatchOut{Stations: entries, AsOf: now.Format(time.RFC3339)}, nil
	}
}
