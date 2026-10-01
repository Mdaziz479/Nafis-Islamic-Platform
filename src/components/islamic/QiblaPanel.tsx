"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useSyncExternalStore } from "react";
import {
  getIslamicPreferencesSnapshot,
  getServerIslamicPreferencesSnapshot,
  subscribeToIslamicPreferences,
  updateIslamicPreferences,
} from "@/components/islamic/islamic-preferences";
import { Button } from "@/components/ui/Button";

interface BearingData {
  readonly direction: number;
  readonly latitude: number;
  readonly longitude: number;
}

type CompassEvent = DeviceOrientationEvent & { readonly webkitCompassHeading?: number };
type CompassConstructor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function QiblaPanel() {
  const preferences = useSyncExternalStore(subscribeToIslamicPreferences, getIslamicPreferencesSnapshot, getServerIslamicPreferencesSnapshot);
  const [bearing, setBearing] = useState<BearingData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassMessage, setCompassMessage] = useState<string | null>(null);
  async function calculateBearing(event?: SyntheticEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (preferences.latitude === null || preferences.longitude === null) {
      setMessage("Enter coordinates or explicitly share your device location.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const query = new URLSearchParams({ latitude: String(preferences.latitude), longitude: String(preferences.longitude) });
      const response = await fetch(`/api/islamic/qibla?${query.toString()}`, { cache: "no-store" });
      const result = await response.json() as { data?: BearingData; message?: string };
      if (!response.ok || !result.data) throw new Error(result.message ?? "Qibla bearing is unavailable.");
      setBearing(result.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Qibla bearing could not be loaded.");
      setBearing(null);
    } finally {
      setLoading(false);
    }
  }

  function useDeviceLocation() {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage("This browser does not support geolocation. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateIslamicPreferences({ city: "", country: "", latitude: coords.latitude, longitude: coords.longitude });
        setMessage("Device coordinates received. Calculate the bearing to continue.");
      },
      () => setMessage("Location permission was unavailable. Enter coordinates manually."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  async function enableCompass() {
    setCompassMessage(null);
    if (!window.isSecureContext) {
      setCompassMessage("A device compass requires a secure HTTPS connection. The bearing fallback remains available.");
      return;
    }
    const orientation = window.DeviceOrientationEvent as CompassConstructor;
    if (!orientation) {
      setCompassMessage("This browser does not provide device orientation. Use the bearing fallback.");
      return;
    }
    if (typeof orientation.requestPermission === "function") {
      try {
        const permission = await orientation.requestPermission();
        if (permission !== "granted") {
          setCompassMessage("Compass permission was not granted. Use the bearing fallback.");
          return;
        }
      } catch {
        setCompassMessage("Compass permission could not be requested. Use the bearing fallback.");
        return;
      }
    }
    setCompassEnabled(true);
    setCompassMessage("Hold the phone flat and away from magnetic objects. Compass accuracy depends on your device.");
  }

  useEffect(() => {
    if (!compassEnabled) return;
    const handleOrientation = (event: Event) => {
      const orientation = event as CompassEvent;
      const value = typeof orientation.webkitCompassHeading === "number"
        ? orientation.webkitCompassHeading
        : typeof orientation.alpha === "number"
          ? (360 - orientation.alpha) % 360
          : null;
      if (value !== null && Number.isFinite(value)) setHeading(value);
    };
    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [compassEnabled]);

  const displayedLocation = preferences.latitude !== null && preferences.longitude !== null
    ? `${preferences.latitude.toFixed(4)}, ${preferences.longitude.toFixed(4)}`
    : "No location selected";
  const indicatorRotation = bearing && heading !== null ? bearing.direction - heading : bearing?.direction ?? 0;

  return (
    <div className="qibla-panel">
      <form className="qibla-location-form" onSubmit={(event) => void calculateBearing(event)}>
        <div>
          <label htmlFor="qibla-latitude">Latitude</label>
          <input id="qibla-latitude" type="number" min={-90} max={90} step="any" value={preferences.latitude ?? ""} onChange={(event) => updateIslamicPreferences({ latitude: event.currentTarget.value === "" ? null : Number(event.currentTarget.value), city: "", country: "" })} placeholder="0 to 90" />
        </div>
        <div>
          <label htmlFor="qibla-longitude">Longitude</label>
          <input id="qibla-longitude" type="number" min={-180} max={180} step="any" value={preferences.longitude ?? ""} onChange={(event) => updateIslamicPreferences({ longitude: event.currentTarget.value === "" ? null : Number(event.currentTarget.value), city: "", country: "" })} placeholder="-180 to 180" />
        </div>
        <Button type="button" variant="secondary" onClick={useDeviceLocation}>Use my location</Button>
        <Button type="submit" disabled={loading || preferences.latitude === null || preferences.longitude === null}>{loading ? "Calculating..." : "Calculate Qibla"}</Button>
      </form>

      <p className="qibla-location-label">Location used: <strong>{displayedLocation}</strong></p>
      {message ? <output className="qibla-message" aria-live="polite">{message}</output> : null}

      {bearing ? (
        <section className="qibla-result" aria-label="Qibla direction result">
          <div className="qibla-compass" aria-label={heading === null ? `Qibla bearing ${bearing.direction.toFixed(1)} degrees clockwise from north` : `Compass indicator points to Qibla`}>
            <span className="qibla-north">N</span>
            <span className="qibla-indicator" style={{ transform: `rotate(${indicatorRotation}deg)` }} aria-hidden="true">↑</span>
            <span className="qibla-kaaba-mark" aria-hidden="true">Q</span>
          </div>
          <p className="qibla-bearing">{bearing.direction.toFixed(1)}° clockwise from north</p>
          {heading === null ? <p className="qibla-fallback">Compass heading is not available; use the numeric bearing.</p> : null}
          <Button type="button" variant="secondary" onClick={() => void enableCompass()} disabled={compassEnabled}>
            {compassEnabled ? "Compass enabled" : "Enable device compass"}
          </Button>
          {compassMessage ? <output className="qibla-message" aria-live="polite">{compassMessage}</output> : null}
        </section>
      ) : null}
    </div>
  );
}