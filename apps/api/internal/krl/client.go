package krl

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const apiBaseURL = "https://kci.id/api/krl"

// Client is a live KRL API client that calls the public kci.id proxy endpoints.
type Client struct {
	httpClient *http.Client
}

// NewClient creates a new KRL client.
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) doGet(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	return c.httpClient.Do(req)
}

// --- raw API shapes ----------------------------------------------------------

type rawStationsResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Data    []struct {
		StaID    string `json:"sta_id"`
		StaName  string `json:"sta_name"`
		GroupWil int    `json:"group_wil"`
		FgEnable int    `json:"fg_enable"`
	} `json:"data"`
}

type rawScheduleResponse struct {
	Status int `json:"status"`
	Data   []struct {
		TrainID   string `json:"train_id"`
		KaName    string `json:"ka_name"`
		RouteName string `json:"route_name"`
		Dest      string `json:"dest"`
		TimeEst   string `json:"time_est"`
		Color     string `json:"color"`
		DestTime  string `json:"dest_time"`
	} `json:"data"`
}

// --- helpers -----------------------------------------------------------------

// stationKey builds the uid key exactly like the comuline reference.
func stationKey(t StationType, id string) string {
	return strings.ToLower(fmt.Sprintf("st_%s_%s", t, id))
}

// fixStationName normalises the concatenated route names used in the KRL
// schedule endpoint to match the names returned by the station list endpoint.
func fixStationName(name string) string {
	switch name {
	case "TANJUNGPRIUK":
		return "TANJUNG PRIOK"
	case "JAKARTAKOTA":
		return "JAKARTA KOTA"
	case "KAMPUNGBANDAN":
		return "KAMPUNG BANDAN"
	case "TANAHABANG":
		return "TANAH ABANG"
	case "PARUNGPANJANG":
		return "PARUNG PANJANG"
	case "BANDARASOEKARNOHATTA":
		return "BANDARA SOEKARNO HATTA"
	default:
		return name
	}
}

// parseKRLTime parses a "HH:MM:SS" string from the KRL API and returns a
// time.Time anchored to today in WIB (Asia/Jakarta, UTC+7).
func parseKRLTime(s string) (time.Time, error) {
	wib := time.FixedZone("WIB", 7*60*60)
	now := time.Now().In(wib)

	var h, m, sec int
	if _, err := fmt.Sscanf(s, "%d:%d:%d", &h, &m, &sec); err != nil {
		return time.Time{}, fmt.Errorf("krl: parse time %q: %w", s, err)
	}
	return time.Date(now.Year(), now.Month(), now.Day(), h, m, sec, 0, wib), nil
}

// --- public API --------------------------------------------------------------

// Stations fetches the live station list from the KRL API.
func (c *Client) Stations(ctx context.Context) ([]Station, error) {
	resp, err := c.doGet(ctx, apiBaseURL+"/stations")
	if err != nil {
		return nil, fmt.Errorf("krl: fetch stations: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("krl: fetch stations: unexpected status %d", resp.StatusCode)
	}

	var raw rawStationsResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("krl: decode stations: %w", err)
	}

	// Extra stations that the comuline project appends manually.
	extras := []Station{
		{
			UID:  stationKey(StationTypeKRL, "BST"),
			ID:   "BST",
			Name: "BANDARA SOEKARNO HATTA",
			Type: StationTypeKRL,
			Metadata: StationMetadata{
				Active: true,
				Origin: StationOriginMeta{FgEnable: 1, Daop: 1},
			},
		},
		{
			UID:  stationKey(StationTypeLocal, "CKP"),
			ID:   "CKP",
			Name: "CIKAMPEK",
			Type: StationTypeLocal,
			Metadata: StationMetadata{
				Active: true,
				Origin: StationOriginMeta{FgEnable: 1, Daop: 1},
			},
		},
		{
			UID:  stationKey(StationTypeLocal, "PWK"),
			ID:   "PWK",
			Name: "PURWAKARTA",
			Type: StationTypeLocal,
			Metadata: StationMetadata{
				Active: true,
				Origin: StationOriginMeta{FgEnable: 1, Daop: 2},
			},
		},
	}

	stations := make([]Station, 0, len(raw.Data)+len(extras))
	stations = append(stations, extras...)

	for _, d := range raw.Data {
		if strings.Contains(d.StaID, "WIL") {
			continue
		}
		daop := d.GroupWil
		if daop == 0 {
			daop = 1
		}
		stations = append(stations, Station{
			UID:  stationKey(StationTypeKRL, d.StaID),
			ID:   d.StaID,
			Name: d.StaName,
			Type: StationTypeKRL,
			Metadata: StationMetadata{
				Active: true,
				Origin: StationOriginMeta{
					FgEnable: d.FgEnable,
					Daop:     daop,
				},
			},
		})
	}

	return stations, nil
}

// Schedule fetches the live schedule for a given station ID from the KRL API.
func (c *Client) Schedule(ctx context.Context, stationID string, stations []Station) ([]Schedule, error) {
	url := fmt.Sprintf(
		"%s/schedules?stationid=%s&timefrom=00:00&timeto=23:00",
		apiBaseURL, strings.ToUpper(stationID),
	)

	resp, err := c.doGet(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("krl: fetch schedule %s: %w", stationID, err)
	}
	defer resp.Body.Close()

	slog.Info("krl: schedule response", "station", stationID, "status", resp.StatusCode)
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusInternalServerError {
		return []Schedule{}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("krl: fetch schedule %s: unexpected status %d", stationID, resp.StatusCode)
	}

	var raw rawScheduleResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("krl: decode schedule %s: %w", stationID, err)
	}

	slog.Info("krl: raw schedule rows", "station", stationID, "count", len(raw.Data))
	// Build a name→id lookup to resolve origin/destination.
	nameToID := make(map[string]string, len(stations))
	for _, s := range stations {
		nameToID[s.Name] = s.ID
	}

	schedules := make([]Schedule, 0, len(raw.Data))
	for _, d := range raw.Data {
		parts := strings.SplitN(d.RouteName, "-", 2)
		originName := fixStationName(parts[0])
		destName := ""
		if len(parts) == 2 {
			destName = fixStationName(parts[1])
		}

		departsAt, err := parseKRLTime(d.TimeEst)
		if err != nil {
			continue
		}
		arrivesAt, err := parseKRLTime(d.DestTime)
		if err != nil {
			continue
		}

		schedules = append(schedules, Schedule{
			ID:                   strings.ToLower(fmt.Sprintf("sc_krl_%s_%s", stationID, d.TrainID)),
			StationID:            strings.ToUpper(stationID),
			StationOriginID:      nameToID[originName],
			StationDestinationID: nameToID[destName],
			TrainID:              d.TrainID,
			Line:                 d.KaName,
			Route:                d.RouteName,
			DepartsAt:            departsAt,
			ArrivesAt:            arrivesAt,
			Metadata: ScheduleMetadata{
				Origin: ScheduleMetadataOrigin{Color: d.Color},
			},
		})
	}

	return schedules, nil
}
