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
    emailDomainNotAllowed:
      "Solo indirizzi email @itecosrl.com sono consentiti.",
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
    duplicateFailed: "Impossibile duplicare la configurazione.",
    statusAlreadyUpdated: "Stato già aggiornato.",
    statusUnauthorized: "Stato non autorizzato.",
    updateNotFoundOrUnauthorized:
      "Configurazione non trovata o non autorizzata per l'aggiornamento.",
    energyChainRequiresGantry:
      "Con alimentazione a catena portacavi, è obbligatoria almeno una pista con portale e larghezza catena configurata.",
    approvedRequiresBom:
      "Per approvare la configurazione è obbligatoria creare la distinta di commessa.",
  },
  bom: {
    unauthorized: "Non autorizzato a modificare la distinta di commessa.",
    unauthorizedState:
      "Non autorizzato a modificare la distinta di commessa in questo stato.",
    alreadyExists:
      "La distinta di commessa esiste già. Usa 'Rigenera' per sovrascriverla.",
    invalidQty: "Quantità non valida.",
    rowNotFound: "Riga non trovata.",
  },
  users: {
    notFound: "Utente non trovato.",
    cannotChangeOwnRole: "Non puoi modificare il tuo ruolo.",
    cannotPromoteToAdmin: "Non è possibile promuovere un utente ad ADMIN.",
    adminOnly: "Accesso riservato agli amministratori.",
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
    configDuplicated: "Configurazione duplicata.",
    duplicateError: "Errore durante la duplicazione.",
    configIncompleteUpdate: "Dati incompleti per l'aggiornamento.",
    statusUpdated: "Stato aggiornato.",
    statusUpdateFailed: "Impossibile aggiornare lo stato.",
    deleteError: "Errore durante l'eliminazione.",
    bomGenerated: "Distinta di commessa generata.",
    bomRegenerated: "Distinta di commessa rigenerata.",
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
    roleUpdated: "Ruolo utente aggiornato.",
    roleUpdateFailed: "Impossibile aggiornare il ruolo.",
    passwordResetSent: "Email di reset password inviata.",
    passwordResetFailed: "Impossibile inviare l'email di reset.",
    subBomLoadFailed: "Impossibile caricare la distinta del sotto-assieme.",
    subBomEmpty: "Il sotto-assieme non contiene articoli.",
  },
  bomWarning: {
    title: "Distinta di commessa presente",
    description:
      "Salvando le modifiche alla configurazione, la distinta di commessa verrà eliminata e dovrà essere rigenerata. Continuare?",
    confirm: "Salva e elimina distinta",
  },
  duplicateConfirm: {
    title: "Conferma duplicazione",
    body: "Verrà creata una copia in stato BOZZA che potrai modificare.",
    validationWarning:
      "Attenzione: questa configurazione contiene valori non più validi secondo le regole attuali. Dopo la duplicazione dovrai correggere i campi evidenziati prima di salvare.",
    confirm: "Duplica",
  },
} as const;
