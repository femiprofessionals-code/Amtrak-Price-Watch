"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createAlert } from "@/actions/alerts";
import { formatCents, toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StationCombobox, type StationOption } from "./station-combobox";
import { IconArrowRight, IconTrain } from "@/components/app/icons";

const STEPS = ["Route", "Travel details", "Price target", "Review"];

const SEAT_LABELS: Record<string, string> = {
  COACH: "Coach",
  BUSINESS: "Business",
  FIRST: "First class",
  ROOMETTE: "Roomette",
};

export function AlertWizard({ stations }: { stations: StationOption[] }) {
  const [step, setStep] = useState(0);
  const [state, formAction, pending] = useActionState(createAlert, null);

  // Wizard state
  const [originId, setOriginId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [travelDate, setTravelDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [seatClass, setSeatClass] = useState("COACH");
  const [targetPrice, setTargetPrice] = useState("");
  const [notifyOnAnyDrop, setNotifyOnAnyDrop] = useState(false);

  // Live fare estimate for step 3. Loading state is derived from whether the
  // stored quote matches the current query — no setState inside the effect body.
  const fareKey =
    step >= 2 && originId && destinationId && travelDate
      ? `${originId}|${destinationId}|${travelDate}|${passengers}|${seatClass}`
      : null;
  const [fare, setFare] = useState<{ key: string; priceCents: number | null } | null>(null);

  const origin = stations.find((s) => s.id === originId);
  const destination = stations.find((s) => s.id === destinationId);

  const minDate = useMemo(() => toDateInputValue(new Date()), []);

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!fareKey) return;
    const [oId, dId, date, pax, cls] = fareKey.split("|");
    let cancelled = false;
    const params = new URLSearchParams({
      originId: oId,
      destinationId: dId,
      travelDate: date,
      passengers: pax,
      seatClass: cls,
    });
    fetch(`/api/fare?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setFare({ key: fareKey, priceCents: data?.priceCents ?? null });
      })
      .catch(() => {
        if (!cancelled) setFare({ key: fareKey, priceCents: null });
      });
    return () => {
      cancelled = true;
    };
  }, [fareKey]);

  const estimate = fareKey && fare?.key === fareKey ? fare.priceCents : null;
  const estimateLoading = !!fareKey && fare?.key !== fareKey;

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!originId) return "Choose a departure station.";
      if (!destinationId) return "Choose a destination station.";
      if (originId === destinationId) return "Departure and destination must be different.";
    }
    if (step === 1) {
      if (!travelDate) return "Choose a travel date.";
      if (travelDate < minDate) return "Travel date must be today or later.";
    }
    if (step === 2) {
      const v = Number(targetPrice);
      if (!targetPrice || Number.isNaN(v) || v < 1) return "Enter a target price of at least $1.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setLocalError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const suggested = estimate != null ? Math.round((estimate * 0.85) / 100) : null;

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <Stepper steps={STEPS} current={step} />

        <form action={formAction} className="mt-8">
          {/* Persist all wizard values regardless of visible step */}
          <input type="hidden" name="originId" value={originId ?? ""} />
          <input type="hidden" name="destinationId" value={destinationId ?? ""} />
          <input type="hidden" name="travelDate" value={travelDate} />
          <input type="hidden" name="passengers" value={passengers} />
          <input type="hidden" name="seatClass" value={seatClass} />
          <input type="hidden" name="targetPrice" value={targetPrice} />
          {notifyOnAnyDrop && <input type="hidden" name="notifyOnAnyDrop" value="on" />}

          {(localError || state?.error) && (
            <div role="alert" className="mb-5 rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">
              {localError ?? state?.error}
            </div>
          )}
          {state?.fieldErrors && !localError && (
            <div role="alert" className="mb-5 rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">
              {Object.values(state.fieldErrors)[0]}
            </div>
          )}

          {step === 0 && (
            <div className="animate-fade-in space-y-5">
              <StationCombobox
                label="Departure"
                name="_origin_display"
                stations={stations}
                value={originId}
                onChange={setOriginId}
                placeholder="e.g. New York"
              />
              <div className="flex justify-center" aria-hidden>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <IconArrowRight className="h-4 w-4 rotate-90" />
                </span>
              </div>
              <StationCombobox
                label="Destination"
                name="_destination_display"
                stations={stations}
                value={destinationId}
                onChange={setDestinationId}
                placeholder="e.g. Boston"
              />
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="wizard-date">Travel date</Label>
                <Input
                  id="wizard-date"
                  type="date"
                  min={minDate}
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="wizard-passengers">Passengers</Label>
                <Select
                  id="wizard-passengers"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "passenger" : "passengers"}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="wizard-class">Seat type</Label>
                <Select id="wizard-class" value={seatClass} onChange={(e) => setSeatClass(e.target.value)}>
                  {Object.entries(SEAT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-5">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[13px] text-muted-foreground">Current fare (per ticket)</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {estimateLoading ? (
                    <span className="text-muted-foreground">Checking…</span>
                  ) : estimate != null ? (
                    formatCents(estimate)
                  ) : (
                    "—"
                  )}
                </p>
                {suggested != null && !estimateLoading && (
                  <button
                    type="button"
                    onClick={() => setTargetPrice(String(suggested))}
                    className="mt-2 text-[13px] font-medium text-primary hover:underline"
                  >
                    Suggest: ${suggested} (15% below current)
                  </button>
                )}
              </div>

              <div>
                <Label htmlFor="wizard-target">Desired fare (USD)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="wizard-target"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="1"
                    className="pl-7"
                    placeholder="99"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  We&apos;ll email you when the fare drops to this price or below.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Also notify on any price drop</p>
                  <p className="text-xs text-muted-foreground">
                    Get an email whenever the fare falls, even above your target.
                  </p>
                </div>
                <Switch checked={notifyOnAnyDrop} onCheckedChange={setNotifyOnAnyDrop} label="Notify on any price drop" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden>
                    <IconTrain className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {origin?.city} → {destination?.city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {origin?.code} → {destination?.code} · Amtrak
                    </p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                  <ReviewItem label="Date" value={travelDate} />
                  <ReviewItem label="Passengers" value={String(passengers)} />
                  <ReviewItem label="Seat" value={SEAT_LABELS[seatClass]} />
                  <ReviewItem label="Target" value={`$${targetPrice}`} />
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {estimate != null && (
                    <Badge variant="outline">Current fare {formatCents(estimate)}</Badge>
                  )}
                  {notifyOnAnyDrop && <Badge variant="primary">Notify on any drop</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll check this fare several times a day and email you the moment it drops below
                your target. You can pause or delete the alert any time.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || pending}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue
                <IconArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" loading={pending}>
                Confirm alert
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
