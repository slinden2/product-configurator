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
    coefficientUpdated: "Coefficiente aggiornato.",
    coefficientCreated: "Coefficiente creato.",
    coefficientDeleted: "Coefficiente eliminato.",
    coefficientReset: "Coefficiente ripristinato al valore predefinito.",
    coefficientSynced: (n: number) =>
      `${n} nuovo/i PN MaxBOM aggiunto/i al listino.`,
    coefficientSyncNone: "Nessun nuovo PN MaxBOM da sincronizzare.",
    offerGenerated: "Offerta generata.",
    offerRegenerated: "Offerta rigenerata.",
    offerDiscountSet: "Sconto aggiornato.",
    offerGenerateError: "Errore durante la generazione dell'offerta.",
    offerDiscountError: "Errore durante l'aggiornamento dello sconto.",
  },
  saveWarning: {
    ebomOnly: {
      title: "Distinta di commessa presente",
      description:
        "Salvando le modifiche alla configurazione, la distinta di commessa verrà eliminata e dovrà essere rigenerata. Continuare?",
      confirm: "Salva e elimina distinta",
    },
    offerOnly: {
      title: "Offerta presente",
      description:
        "Salvando le modifiche alla configurazione, l'offerta verrà eliminata e dovrà essere rigenerata. Continuare?",
      confirm: "Salva e elimina offerta",
    },
    both: {
      title: "Distinta e offerta presenti",
      description:
        "Salvando le modifiche alla configurazione, la distinta di commessa e l'offerta verranno eliminate e dovranno essere rigenerate. Continuare?",
      confirm: "Salva e elimina",
    },
  },
  duplicateConfirm: {
    title: "Conferma duplicazione",
    body: "Verrà creata una copia in stato BOZZA che potrai modificare.",
    validationWarning:
      "Attenzione: questa configurazione contiene valori non più validi secondo le regole attuali. Dopo la duplicazione dovrai correggere i campi evidenziati prima di salvare.",
    confirm: "Duplica",
  },
  energyChainWall: {
    supplySection:
      "Attenzione: la combinazione catena portacavi + mensole a muro richiede una revisione manuale da parte dell'ufficio tecnico. La distinta non può essere generata automaticamente per questa configurazione.",
    washBayForm:
      "Revisione ufficio tecnico richiesta: con catena portacavi + mensole a muro i campi non relativi alla catena sono bloccati. Configurare solo la sezione «Catenaria».",
  },
  coefficient: {
    notFound: "Coefficiente non trovato.",
    adminOnly: "Solo gli amministratori possono gestire i coefficienti.",
    cannotDeleteMaxbom:
      "I coefficienti MaxBOM non possono essere eliminati manualmente.",
    cannotResetManual:
      "Solo i coefficienti MaxBOM possono essere ripristinati al valore predefinito.",
    pnRequired: "Codice articolo obbligatorio.",
    pnAlreadyExists: "Esiste già un coefficiente per questo codice articolo.",
    invalidCoefficient:
      "Valore coefficiente non valido (deve essere tra 0 e 5).",
  },
  offer: {
    unauthorized: "Solo SALES e ADMIN possono gestire l'offerta.",
    cannotEdit:
      "Non è possibile modificare l'offerta in questo stato della configurazione.",
    notFound: "Offerta non trovata.",
    invalidDiscount:
      "Sconto non valido (deve essere tra 0% e 40%, multiplo di 0,5%).",
    generateError: "Errore durante la generazione dell'offerta.",
    drift: {
      title: "Distinta aggiornata",
      liveButEbomExists:
        "Offerta generata senza distinta validata. L'Ufficio Tecnico ha ora creato una distinta — rigenera per usarla.",
      ebomChanged:
        "La distinta è stata modificata dall'Ufficio Tecnico dopo la generazione dell'offerta. Rigenera per aggiornare i prezzi.",
    },
    staleness: {
      title: "Prezzi scaduti",
      body: (generatedAt: string, expiredDays: number) =>
        `Prezzi generati il ${generatedAt} — scaduti da ${expiredDays} ${expiredDays === 1 ? "giorno" : "giorni"}. Rigenera l'offerta prima di condividerla con il cliente.`,
    },
  },
} as const;
