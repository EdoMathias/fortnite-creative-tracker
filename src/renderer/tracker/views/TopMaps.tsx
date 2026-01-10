import React from "react"
import { MapData } from "../../../shared/consts"
import MapCard from "../../components/MapCard"
import { useMapsData } from "../../hooks/useMapsData";

const TopMaps = () => {
    const { topMaps } = useMapsData();
    return (
        <div className="overview-tile overview-tile-wide">
            <div className="overview-tile-header">
                <h3>🏆 Top Played Maps</h3>
            </div>
            <div className="overview-maps-list">
                <div className="overview-map-item overview-map-empty">
                    {topMaps.map((map: MapData) => (
                        <MapCard key={map.map_id} map={map} />
                    ))}
                    {/* <span className="overview-map-empty-text">No map data yet</span> */}
                </div>
            </div>
        </div>
    )
}

export default TopMaps