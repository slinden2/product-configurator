"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MSG } from "@/lib/messages";
import type { OfferDisplaySettings } from "@/lib/offer-settings";
import type { InstallationItemKind, TransportMode } from "@/types";
import {
  InstallationItemKindLabels,
  InstallationModeLabels,
  TransportModeLabels,
  TransportModes,
  WarrantyMonthsOptions,
} from "@/types";
import DiscountInput from "./discount-input";

interface Props {
  initialDiscount: number;
  initialSettings: OfferDisplaySettings;
  /** Persists the discount — a revision-scoped server action. */
  onSaveDiscount: (
    discount: number,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Persists the settings — a revision-scoped server action. */
  onSaveSettings: (
    settings: OfferDisplaySettings,
  ) => Promise<{ success: boolean; error?: string }>;
}

function amountDrafts(settings: OfferDisplaySettings) {
  return Object.fromEntries(
    settings.installation_items.map((item) => [
      item.kind,
      item.amount.toString(),
    ]),
  ) as Record<InstallationItemKind, string>;
}

/** yyyy-mm-dd value for a native date input; empty string when unset. */
function dateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default function OfferSettingsCard({
  initialDiscount,
  initialSettings,
  onSaveDiscount,
  onSaveSettings,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [transportDraft, setTransportDraft] = useState(
    initialSettings.transport_amount.toString(),
  );
  const [itemDrafts, setItemDrafts] = useState(amountDrafts(initialSettings));
  const [deliveryDraft, setDeliveryDraft] = useState(
    dateInputValue(initialSettings.delivery_date),
  );
  const [destinationDraft, setDestinationDraft] = useState(
    initialSettings.delivery_destination,
  );
  const [paymentDraft, setPaymentDraft] = useState(
    initialSettings.payment_terms,
  );
  const [isPending, startTransition] = useTransition();
  const lastSaved = useRef(initialSettings);

  // Editability is gated by conditional rendering in the parent (quote-view
  // only mounts this card when the revision is editable), so the only local
  // disable condition is an in-flight save — shared with DiscountInput because
  // discount and settings mutate the same revision row.
  const controlsDisabled = isPending;

  const persist = (next: OfferDisplaySettings) => {
    setSettings(next);
    startTransition(async () => {
      const rollback = () => {
        setSettings(lastSaved.current);
        setTransportDraft(lastSaved.current.transport_amount.toString());
        setItemDrafts(amountDrafts(lastSaved.current));
        setDeliveryDraft(dateInputValue(lastSaved.current.delivery_date));
        setDestinationDraft(lastSaved.current.delivery_destination);
        setPaymentDraft(lastSaved.current.payment_terms);
      };
      try {
        const result = await onSaveSettings(next);
        if (result.success) {
          lastSaved.current = next;
          toast.success(MSG.toast.offerSettingsSet);
        } else {
          toast.error(result.error ?? MSG.toast.offerSettingsError);
          rollback();
        }
      } catch {
        toast.error(MSG.toast.offerSettingsError);
        rollback();
      }
    });
  };

  const handleTransportAmountBlur = () => {
    const numeric = parseFloat(transportDraft);
    if (Number.isNaN(numeric) || numeric < 0) {
      setTransportDraft(settings.transport_amount.toString());
      return;
    }
    if (numeric === settings.transport_amount) return;
    persist({ ...settings, transport_amount: numeric });
  };

  const handleItemAmountBlur = (kind: InstallationItemKind) => {
    const item = settings.installation_items.find((i) => i.kind === kind);
    if (!item) return;
    const numeric = parseFloat(itemDrafts[kind]);
    if (Number.isNaN(numeric) || numeric < 0) {
      setItemDrafts({ ...itemDrafts, [kind]: item.amount.toString() });
      return;
    }
    if (numeric === item.amount) return;
    persist({
      ...settings,
      installation_items: settings.installation_items.map((i) =>
        i.kind === kind ? { ...i, amount: numeric } : i,
      ),
    });
  };

  const handleDeliveryDateBlur = () => {
    // A native date input yields "" or a valid yyyy-mm-dd (parsed as UTC
    // midnight, symmetric with dateInputValue).
    const next = deliveryDraft ? new Date(`${deliveryDraft}T00:00:00Z`) : null;
    if (next && Number.isNaN(next.getTime())) {
      setDeliveryDraft(dateInputValue(settings.delivery_date));
      return;
    }
    if (
      (next?.getTime() ?? null) === (settings.delivery_date?.getTime() ?? null)
    )
      return;
    persist({ ...settings, delivery_date: next });
  };

  const handleWarrantyChange = (value: string) => {
    const months = WarrantyMonthsOptions.find((m) => m.toString() === value);
    if (!months || months === settings.warranty_months) return;
    persist({ ...settings, warranty_months: months });
  };

  // Text drafts are trimmed on blur so local state matches what the server
  // stores (the Zod schema trims before persisting).
  const handleDestinationBlur = () => {
    const trimmed = destinationDraft.trim();
    setDestinationDraft(trimmed);
    if (trimmed === settings.delivery_destination) return;
    persist({ ...settings, delivery_destination: trimmed });
  };

  const handlePaymentTermsBlur = () => {
    const trimmed = paymentDraft.trim();
    setPaymentDraft(trimmed);
    if (trimmed === settings.payment_terms) return;
    persist({ ...settings, payment_terms: trimmed });
  };

  const handleItemIncludedChange = (
    kind: InstallationItemKind,
    included: boolean,
  ) => {
    persist({
      ...settings,
      installation_items: settings.installation_items.map((i) =>
        i.kind === kind ? { ...i, included } : i,
      ),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni offerta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DiscountInput
          initialDiscount={initialDiscount}
          disabled={controlsDisabled}
          onSave={onSaveDiscount}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="show-net-total-only"
            checked={settings.show_net_total_only}
            onCheckedChange={(checked) =>
              persist({ ...settings, show_net_total_only: checked === true })
            }
            disabled={controlsDisabled}
          />
          <Label htmlFor="show-net-total-only">Mostra solo totale netto</Label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Trasporto</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="transport-mode" className="whitespace-nowrap">
                Modalità
              </Label>
              <Select
                value={settings.transport_mode}
                onValueChange={(value) =>
                  persist({
                    ...settings,
                    transport_mode: value as TransportMode,
                  })
                }
                disabled={controlsDisabled}
              >
                <SelectTrigger id="transport-mode" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TransportModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {TransportModeLabels[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="transport-amount" className="whitespace-nowrap">
                Importo (€)
              </Label>
              <Input
                id="transport-amount"
                type="number"
                min={0}
                step={50}
                value={transportDraft}
                onChange={(e) => setTransportDraft(e.target.value)}
                onBlur={handleTransportAmountBlur}
                disabled={controlsDisabled}
                className="w-32"
              />
            </div>
          </div>
          {settings.transport_mode === "TBD" && (
            <p className="text-xs text-muted-foreground">
              Con modalità «Da definire» l'importo non viene conteggiato nel
              totale.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Installazione</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="installation-mode" className="whitespace-nowrap">
              Modalità
            </Label>
            <Select
              value={settings.installation_mode}
              onValueChange={(value) =>
                persist({
                  ...settings,
                  installation_mode: value as TransportMode,
                })
              }
              disabled={controlsDisabled}
            >
              <SelectTrigger id="installation-mode" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TransportModes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {InstallationModeLabels[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {settings.installation_mode === "TBD" && (
            <p className="text-xs text-muted-foreground">
              Con modalità «Da definire» l'installazione non viene conteggiata
              nel totale.
            </p>
          )}
          <div className="space-y-2 pl-6">
            {settings.installation_items.map((item) => (
              <div key={item.kind} className="flex items-center gap-2">
                <Checkbox
                  id={`installation-included-${item.kind}`}
                  checked={item.included}
                  onCheckedChange={(checked) =>
                    handleItemIncludedChange(item.kind, checked === true)
                  }
                  disabled={controlsDisabled}
                />
                <Label
                  htmlFor={`installation-included-${item.kind}`}
                  className="w-44"
                >
                  {InstallationItemKindLabels[item.kind]}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  aria-label={`Importo ${InstallationItemKindLabels[item.kind]} (€)`}
                  value={itemDrafts[item.kind]}
                  onChange={(e) =>
                    setItemDrafts({
                      ...itemDrafts,
                      [item.kind]: e.target.value,
                    })
                  }
                  onBlur={() => handleItemAmountBlur(item.kind)}
                  disabled={controlsDisabled}
                  className="w-32"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Condizioni di fornitura</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="delivery-date">Data di consegna</Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDraft}
                onChange={(e) => setDeliveryDraft(e.target.value)}
                onBlur={handleDeliveryDateBlur}
                disabled={controlsDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Se vuota, sull'offerta compare «Da definire».
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="warranty-months">Garanzia</Label>
              <Select
                value={settings.warranty_months.toString()}
                onValueChange={handleWarrantyChange}
                disabled={controlsDisabled}
              >
                <SelectTrigger id="warranty-months" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WarrantyMonthsOptions.map((months) => (
                    <SelectItem key={months} value={months.toString()}>
                      {months} mesi
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="delivery-destination">Destinazione</Label>
              <Input
                id="delivery-destination"
                type="text"
                maxLength={500}
                placeholder="Indirizzo del cliente"
                value={destinationDraft}
                onChange={(e) => setDestinationDraft(e.target.value)}
                onBlur={handleDestinationBlur}
                disabled={controlsDisabled}
              />
              <p className="text-xs text-muted-foreground">
                Se vuota, sull'offerta viene indicato l'indirizzo del cliente.
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="payment-terms">Modalità di pagamento</Label>
              <Input
                id="payment-terms"
                type="text"
                maxLength={500}
                placeholder="Da definire"
                value={paymentDraft}
                onChange={(e) => setPaymentDraft(e.target.value)}
                onBlur={handlePaymentTermsBlur}
                disabled={controlsDisabled}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
