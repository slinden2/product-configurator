"use client";

import * as React from "react";

// App-level "whole form is disabled" flag, provided by ConfigForm and
// SubRecordForm and consumed by SelectField/CheckboxField. Lives here (not in
// the vendored ui/form.tsx) so re-running `npx shadcn add form` cannot wipe it.
const FormDisabledContext = React.createContext<boolean>(false);

function useFormDisabled() {
  return React.useContext(FormDisabledContext);
}

export { FormDisabledContext, useFormDisabled };
