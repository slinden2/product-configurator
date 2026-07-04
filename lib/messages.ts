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
    energyChainBayGuard:
      "Operazione non consentita: con alimentazione a catena portacavi deve rimanere almeno una pista con portale e larghezza catena configurata.",
    approvedRequiresBom:
      "Per approvare la configurazione è obbligatoria creare la distinta di commessa.",
    salesReviewRequiresOffer:
      "Per inviare la configurazione in revisione vendite è obbligatorio generare l'offerta.",
    salesApprovedRequiresOffer:
      "Per approvare la configurazione è obbligatorio che l'offerta sia presente.",
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
    invalidManager: "Il responsabile selezionato non è valido.",
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
    configSavedSubmitHint:
      "Configurazione salvata. Puoi inviarla dalla pagina di visualizzazione.",
    configCreated: "Configurazione creata.",
    offerCreated: "Offerta creata.",
    offerLineCreated: "Configurazione aggiunta all'offerta.",
    offerLineRemoved: "Configurazione rimossa dall'offerta.",
    offerRevisionSent: "Revisione inviata.",
    offerRevisionSubmitted: "Revisione inviata in approvazione.",
    offerRevisionApproved: "Revisione approvata per l'invio.",
    offerRevisionReturnedToDraft: "Revisione riportata in bozza.",
    offerRevisionCreated: "Nuova revisione creata.",
    offerRenegotiationCreated: "Rinegoziazione creata.",
    offerRevisionAccepted:
      "Offerta accettata: configurazioni in lavorazione tecnica.",
    offerRenegotiationAccepted:
      "Rinegoziazione accettata: venduto ricongelato sui nuovi prezzi.",
    offerRevisionUnaccepted: "Accettazione annullata.",
    offerRevisionDeclined: "Rifiuto del cliente registrato.",
    offerRevisionExpired: "Revisione segnata come scaduta.",
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
    managerUpdated: "Responsabile aggiornato.",
    managerUpdateFailed: "Impossibile aggiornare il responsabile.",
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
    surchargeUpdated: "Maggiorazione aggiornata.",
    installationItemUpdated: "Costo di installazione aggiornato.",
    offerGenerated: "Offerta generata.",
    offerRegenerated: "Offerta rigenerata.",
    offerDiscountSet: "Sconto aggiornato.",
    offerGenerateError: "Errore durante la generazione dell'offerta.",
    offerDiscountError: "Errore durante l'aggiornamento dello sconto.",
    offerSettingsSet: "Impostazioni offerta aggiornate.",
    offerSettingsError:
      "Errore durante l'aggiornamento delle impostazioni offerta.",
  },
  saveWarning: {
    ebomOnly: {
      title: "Distinta di commessa presente",
      description:
        "Salvando le modifiche alla configurazione, la distinta di commessa verrà eliminata e dovrà essere rigenerata. Continuare?",
      confirm: "Salva e elimina distinta",
    },
  },
  duplicateConfirm: {
    title: "Conferma duplicazione",
    body: "Verrà creata una copia in stato BOZZA che potrai modificare.",
    validationWarning:
      "Attenzione: questa configurazione contiene valori non più validi secondo le regole attuali. Dopo la duplicazione dovrai correggere i campi evidenziati prima di salvare.",
    confirm: "Duplica",
  },
  passwordResetConfirm: {
    title: "Conferma invio email di reset password",
    body: "Verrà inviata un'email di reset password all'utente. Continuare?",
    confirm: "Invia email",
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
  surcharge: {
    notFound: "Maggiorazione non trovata.",
    priceNotConfigured:
      "Il prezzo di una o più maggiorazioni non è configurato. Contattare un amministratore.",
    adminOnly: "Solo gli amministratori possono gestire le maggiorazioni.",
  },
  installation: {
    notFound: "Voce di installazione non trovata.",
    adminOnly:
      "Solo gli amministratori possono gestire i costi di installazione.",
  },
  offer: {
    unauthorized:
      "Solo il personale vendite e ADMIN possono gestire l'offerta.",
    cannotEdit:
      "Non è possibile modificare l'offerta in questo stato della configurazione.",
    notFound: "Offerta non trovata.",
    createFailed: "Impossibile creare l'offerta.",
    numberRetry:
      "Numero offerta già in uso, riprova. Se il problema persiste, contatta l'amministratore.",
    lineCannotEdit:
      "Le configurazioni dell'offerta sono modificabili solo finché la revisione è in bozza.",
    frozenCannotRegenerate:
      "L'offerta è congelata come venduta e non può essere rigenerata.",
    frozenCannotEdit:
      "L'offerta è congelata come venduta e non può essere modificata.",
    invalidDiscount:
      "Sconto non valido (deve essere tra 0% e 40%, multiplo di 0,5%).",
    invalidSettings: "Impostazioni offerta non valide.",
    generateError: "Errore durante la generazione dell'offerta.",
    cannotSend: "Solo una revisione approvata per l'invio può essere inviata.",
    cannotSendEmpty:
      "Aggiungi almeno una configurazione prima di inviare la revisione.",
    lineEnergyChainInvalid: (name: string) =>
      `La configurazione «${name}» richiede almeno una pista con portale e larghezza catena configurata (alimentazione a catena portacavi).`,
    cannotSubmit:
      "Solo una revisione in bozza può essere inviata in approvazione.",
    cannotApprove: "Solo una revisione in approvazione può essere approvata.",
    cannotReturnToDraft:
      "Solo una revisione in approvazione o approvata può essere riportata in bozza.",
    unauthorizedApprove:
      "Solo i responsabili vendite, i direttori vendite e gli ADMIN possono approvare le revisioni.",
    cannotAccept: "Solo una revisione inviata può essere accettata.",
    cannotRecordOutcome:
      "L'esito del cliente può essere registrato solo su una revisione inviata.",
    alreadyAccepted:
      "L'offerta è già stata accettata e non può più essere modificata.",
    cannotUnaccept:
      "Solo un ADMIN può annullare l'accettazione di una revisione accettata.",
    unacceptEngineeringStarted:
      "Impossibile annullare l'accettazione: l'ufficio tecnico ha già preso in carico almeno una configurazione.",
    unacceptRenegotiation:
      "L'annullamento non è disponibile su una riaccettazione di rinegoziazione.",
    unacceptConfirm:
      "Annullare l'accettazione? La revisione tornerà «Inviata», l'offerta si sbloccherà e le configurazioni torneranno in bozza (uscendo dall'ufficio tecnico). Usa solo per correggere un'accettazione errata.",
    workingRevisionExists:
      "Esiste già una revisione di lavoro non ancora inviata. Completane l'invio prima di crearne una nuova.",
    submitConfirm:
      "Inviare questa revisione in approvazione? Le configurazioni si bloccheranno finché un responsabile non la approva o la riporta in bozza.",
    approveConfirm:
      "Approvare questa revisione per l'invio? Potrà poi essere inviata al cliente.",
    rejectConfirm:
      "Riportare questa revisione in bozza? L'agente potrà modificarla e reinviarla in approvazione.",
    unapproveConfirm:
      "Revocare l'approvazione e riportare la revisione in bozza? Le configurazioni torneranno modificabili.",
    sendConfirm:
      "Inviare questa revisione? I prezzi verranno congelati e le configurazioni non saranno più modificabili.",
    acceptConfirm:
      "Registrare l'accettazione del cliente? Le configurazioni passeranno all'ufficio tecnico (come venduto) e l'offerta verrà bloccata.",
    declineConfirm:
      "Registrare il rifiuto del cliente per questa revisione? Potrai creare una nuova revisione per riprovare.",
    expireConfirm:
      "Segnare questa revisione come scaduta? Potrai creare una nuova revisione per riprovare.",
    createRevisionConfirm:
      "Creare una nuova revisione? Le configurazioni verranno clonate in righe modificabili.",
    revertConfirm:
      "Creare una nuova revisione a partire da questa? Le sue configurazioni verranno clonate in righe modificabili.",
    renegotiationUnauthorized:
      "Solo i direttori vendite e gli ADMIN possono avviare una rinegoziazione.",
    renegotiationNotAccepted:
      "La rinegoziazione è possibile solo su un'offerta accettata.",
    renegotiationLinesLocked:
      "Le configurazioni di una rinegoziazione non sono modificabili: solo prezzi e condizioni commerciali.",
    renegotiateConfirm:
      "Avviare una rinegoziazione? Verrà creata una nuova revisione con le configurazioni correnti (sola lettura) e i prezzi ricalcolati; le condizioni commerciali saranno modificabili fino all'invio.",
    renegotiationBadge: "Rinegoziazione",
    acceptedSupersededBadge: "Accettata (superata)",
    reacceptConfirm:
      "Registrare l'accettazione della rinegoziazione? Il venduto verrà ricongelato sui nuovi prezzi; le configurazioni restano all'ufficio tecnico.",
    staleness: {
      title: "Prezzi scaduti",
      body: (generatedAt: string, expiredDays: number) =>
        `Prezzi generati il ${generatedAt} — scaduti da ${expiredDays} ${expiredDays === 1 ? "giorno" : "giorni"}. Rigenera l'offerta prima di condividerla con il cliente.`,
    },
  },
  marginReview: {
    noOffer: "Nessuna offerta presente per questa configurazione.",
    asSoldDiffTitle: "Variazioni di configurazione rispetto al venduto",
    asSoldNoChanges:
      "Nessuna variazione di configurazione rispetto al venduto.",
    asSoldDiffUnavailable:
      "Confronto con il venduto non disponibile: snapshot mancante o non leggibile.",
    lineDiffTitleFrozen: "Variazioni distinta base rispetto al venduto",
    lineDiffTitleQuote: "Variazioni distinta base rispetto all'offerta",
    lineDiffNoChangesFrozen:
      "Nessuna variazione nella distinta base rispetto al venduto.",
    lineDiffNoChangesQuote:
      "Nessuna variazione nella distinta base rispetto all'offerta.",
    belowThresholdBadge: "Margine sotto soglia",
    absorbButton: "Accetta margine ridotto",
    absorbConfirmTitle: "Accettare il margine ridotto?",
    absorbConfirmBody: (marginPct: string, thresholdPct: string) =>
      `La marginalità attuale (${marginPct}) è inferiore alla soglia minima del ${thresholdPct}. Confermando, la decisione verrà registrata e l'avviso rimosso finché la marginalità non scenderà sotto il valore accettato.`,
    absorbNoteLabel: "Nota (facoltativa)",
    absorbSuccess: "Margine ridotto accettato.",
    absorbUnauthorized: "Non autorizzato ad accettare il margine ridotto.",
    absorbNotAccepted:
      "Nessuna riga d'offerta accettata e congelata per questa configurazione.",
    absorbNotActive:
      "La marginalità non è sotto soglia: nessuna decisione da registrare.",
    signOffTitle: "Margine ridotto accettato",
    signOffBody: (by: string, at: string, marginPct: string) =>
      `Accettato da ${by} il ${at} con marginalità ${marginPct}.`,
    signOffNoteLabel: "Nota",
    renegotiateButton: "Rinegozia",
    renegotiationOpen: "Rinegoziazione in corso",
  },
} as const;
