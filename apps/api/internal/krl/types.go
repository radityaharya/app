package krl

import "time"

// StationType mirrors the comuline enum.
type StationType string

const (
	StationTypeKRL   StationType = "KRL"
	StationTypeLocal StationType = "LOCAL"
)

// StationOriginMeta holds KRL-origin fields.
type StationOriginMeta struct {
	Daop     int `json:"daop"`
	FgEnable int `json:"fg_enable"`
}

// StationMetadata mirrors the comuline metadata shape.
type StationMetadata struct {
	Active bool              `json:"active"`
	Origin StationOriginMeta `json:"origin"`
}

// Station is the canonical station record.
type Station struct {
	UID      string          `json:"uid"`
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Type     StationType     `json:"type"`
	Metadata StationMetadata `json:"metadata"`
}

// ScheduleMetadataOrigin holds colour info for a train line.
type ScheduleMetadataOrigin struct {
	Color string `json:"color"`
}

// ScheduleMetadata mirrors the comuline metadata shape.
type ScheduleMetadata struct {
	Origin ScheduleMetadataOrigin `json:"origin"`
}

// Schedule is the canonical schedule record for a stop at a station.
type Schedule struct {
	ID                   string           `json:"id"`
	StationID            string           `json:"station_id"`
	StationOriginID      string           `json:"station_origin_id"`
	StationDestinationID string           `json:"station_destination_id"`
	TrainID              string           `json:"train_id"`
	Line                 string           `json:"line"`
	Route                string           `json:"route"`
	DepartsAt            time.Time        `json:"departs_at"`
	ArrivesAt            time.Time        `json:"arrives_at"`
	Metadata             ScheduleMetadata `json:"metadata"`
}
