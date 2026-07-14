"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ActivityAction,
  ActivityActionLabels,
  ActivityActions,
} from "@/types";

// Sentinel for the "no filter" option (Radix Select disallows empty values).
const ALL_VALUE = "all";

const ACTION_OPTIONS = [...ActivityActions].sort((a, b) =>
  ActivityActionLabels[a].localeCompare(ActivityActionLabels[b], "it"),
);

interface ActivityFiltersProps {
  users: { id: string; email: string }[];
  action?: ActivityAction;
  userId?: string;
}

const ActivityFilters = ({ users, action, userId }: ActivityFiltersProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters live in the URL so the view is shareable. `page` is deliberately
  // dropped: the current page number is meaningless once the result set changes.
  const pushFilters = (next: { action?: string; user?: string }) => {
    const params = new URLSearchParams();
    if (next.action) params.set("action", next.action);
    if (next.user) params.set("user", next.user);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/gestione/attivita?${query}` : "/gestione/attivita");
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Select
        value={action ?? ALL_VALUE}
        disabled={isPending}
        onValueChange={(value) =>
          pushFilters({
            action: value === ALL_VALUE ? undefined : value,
            user: userId,
          })
        }
      >
        <SelectTrigger
          className="w-full sm:w-80"
          aria-label="Filtra per azione"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tutte le azioni</SelectItem>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {ActivityActionLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={userId ?? ALL_VALUE}
        disabled={isPending}
        onValueChange={(value) =>
          pushFilters({
            action,
            user: value === ALL_VALUE ? undefined : value,
          })
        }
      >
        <SelectTrigger
          className="w-full sm:w-72"
          aria-label="Filtra per utente"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tutti gli utenti</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ActivityFilters;
