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
import type { OfferSnapshotSettings } from "@/lib/offer-settings";
import type { InstallationItemKind, TransportMode } from "@/types";
import {
  InstallationItemKindLabels,
  InstallationModeLabels,
  TransportModeLabels,
  TransportModes,
} from "@/types";
import DiscountInput from "./discount-input";

interface Props {
  initialDiscount: number;
  initialSettings: OfferSnapshotSettings;
  disabled?: boolean;
  /** Persists the discount — a per-config or per-revision server action. */
  onSaveDiscount: (
    discount: number,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Persists the settings — a per-config or per-revision server action. */
  onSaveSettings: (
    settings: OfferSnapshotSettings,
  ) => Promise<{ success: boolean; error?: string }>;
}

function amountDrafts(settings: OfferSnapshotSettings) {
  return Object.fromEntries(
    settings.installation_items.map((item) => [
      item.kind,
      item.amount.toString(),
    ]),
  ) as Record<InstallationItemKind, string>;
}

export default function OfferSettingsCard({
  initialDiscount,
  initialSettings,
  disabled,
  onSaveDiscount,
  onSaveSettings,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [transportDraft, setTransportDraft] = useState(
    initialSettings.transport_amount.toString(),
  );
  const [itemDrafts, setItemDrafts] = useState(amountDrafts(initialSettings));
  const [isPending, startTransition] = useTransition();
  const lastSaved = useRef(initialSettings);

  const controlsDisabled = disabled || isPending;

  const persist = (next: OfferSnapshotSettings) => {
    setSettings(next);
    startTransition(async () => {
      const result = await onSaveSettings(next);
      if (result.success) {
        lastSaved.current = next;
        toast.success(MSG.toast.offerSettingsSet);
      } else {
        toast.error(result.error ?? MSG.toast.offerSettingsError);
        setSettings(lastSaved.current);
        setTransportDraft(lastSaved.current.transport_amount.toString());
        setItemDrafts(amountDrafts(lastSaved.current));
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
          disabled={disabled}
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
      </CardContent>
    </Card>
  );
}
