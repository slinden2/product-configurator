/**
 * Centralized Italian messages for server actions, components, and DB queries.
 * Single source of truth — import `MSG` wherever a user-facing message is needed.
 */
export const MSG = {
  auth: {
    userNotFound: "Utente non trovato.",
    userNotAuthenticated: "Utente non trovato o non autenticato.",
    unauthorized: "Non autorizzato.",
    unauthorizedSubRecord:
      "Non autorizzato a modificare/eliminare questo record.",
    userUnauthorized: "Utente non autorizzato.",
    emailAlreadyRegistered:
      "Utente con questo indirizzo email già registrato. Effettua il login per proseguire.",
    missingResetCode: "Codice di reset mancante.",
    genericError: "Errore durante l'autenticazione.",
    invalidData: "Dati di autenticazione non validi.",
  },
  config: {
    notFound: "Configurazione non trovata.",
    associatedNotFound: "Configurazione associata non trovata.",
    cannotEdit:
      "Non è possibile modificare una configurazione in questo stato.",
    cannotDelete:
      "Non è possibile eliminare una configurazione in questo stato.",
    cannotEditSubRecord:
      "Non è possibile modificare i record di una configurazione in questo stato.",
    createFailed: "Impossibile creare la configurazione.",
    statusAlreadyUpdated: "Stato già aggiornato.",
    statusUnauthorized: "Stato non autorizzato.",
    updateNotFoundOrUnauthorized:
      "Configurazione non trovata o non autorizzata per l'aggiornamento.",
    energyChainRequiresGantry:
      "Con alimentazione a catena portacavi, è obbligatoria almeno una pista con portale e larghezza catena configurata.",
  },
  bom: {
    unauthorized: "Non autorizzato a modificare la distinta ingegneria.",
    unauthorizedState:
      "Non autorizzato a modificare la distinta ingegneria in questo stato.",
    alreadyExists:
      "La distinta ingegneria esiste già. Usa 'Rigenera' per sovrascriverla.",
    invalidQty: "Quantità non valida.",
    rowNotFound: "Riga non trovata.",
  },
  db: {
    error: "Errore del database.",
    unknown: "Errore sconosciuto.",
  },
  entity: {
    invalidData: (name: string) => `Dati ${name} non validi.`,
    unknownError: (action: string, name: string) =>
      `Errore sconosciuto durante l'operazione ${action} su ${name}.`,
  },
  toast: {
    configUpdated: "Configurazione aggiornata.",
    configCreated: "Configurazione creata.",
    configDeleted: "Configurazione eliminata con successo.",
    configIncompleteUpdate: "Dati incompleti per l'aggiornamento.",
    statusUpdated: "Stato aggiornato.",
    statusUpdateFailed: "Impossibile aggiornare lo stato.",
    deleteError: "Errore durante l'eliminazione.",
    bomGenerated: "Distinta ingegneria generata.",
    bomRegenerated: "Distinta ingegneria rigenerata.",
    qtyUpdated: "Quantità aggiornata.",
    qtyInvalid: "Quantità non valida (minimo 1).",
    rowAdded: "Riga aggiunta.",
    customRowAdded: "Riga personalizzata aggiunta.",
    rowRestored: "Riga ripristinata.",
    rowDeleted: "Riga eliminata.",
    pnRequired: "Seleziona un codice articolo.",
    pnMandatory: "Codice articolo obbligatorio.",
    updateError: "Errore aggiornamento.",
    operationError: "Errore operazione.",
    generateError: "Errore durante la generazione.",
    regenerateError: "Errore durante la rigenerazione della distinta.",
    addError: "Errore durante l'aggiunta.",
    entityUpdated: (name: string, index?: number | null) =>
      `${name} ${index ?? ""} aggiornat${name === "Pista" ? "a" : "o"}.`,
    entityCreated: (name: string) =>
      `${name} creat${name === "Pista" ? "a" : "o"}.`,
    entityDeleted: (name: string, index?: number | null) =>
      `${name} ${index ?? ""} eliminat${name === "Pista" ? "a" : "o"}.`,
    entityUpdateFallback: (name: string) =>
      `Errore durante l'aggiornamento (${name}).`,
    entityCreateFallback: (name: string) =>
      `Errore durante la creazione (${name}).`,
    entityDeleteFailed: (name: string) => `Impossibile eliminare ${name}.`,
    entitySaveUnknown: (name: string) =>
      `Errore sconosciuto durante il salvataggio (${name}).`,
    entityDeleteUnknown: (name: string) =>
      `Errore sconosciuto durante l'eliminazione (${name}).`,
    passwordResetEmailSent: "Email per resettare la password inviata.",
    passwordResetSuccess: "Password aggiornata con successo.",
    validationErrors: "Errori di validazione: correggere i campi evidenziati.",
  },
  bomWarning: {
    title: "Distinta ingegneria presente",
    description:
      "Salvando le modifiche alla configurazione, la distinta ingegneria verrà eliminata e dovrà essere rigenerata. Continuare?",
    confirm: "Salva e elimina distinta",
  },
} as const;
