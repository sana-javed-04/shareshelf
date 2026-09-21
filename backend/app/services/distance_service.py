from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres (Haversine)."""
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
    except (ValueError, TypeError):
        return 0.0

    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    
    # 2 decimal places in km (e.g. 0.45 km, 1.20 km)
    return round(2 * EARTH_RADIUS_KM * asin(min(1.0, sqrt(a))), 2)


def fuzz_coordinates(lat: float, lng: float) -> tuple[float, float]:
    """Keeps coordinates accurate enough (~10m) so distance calculation works properly."""
    return round(float(lat), 4), round(float(lng), 4)