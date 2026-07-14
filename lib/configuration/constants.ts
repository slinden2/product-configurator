/**
 * Validation-only name for a new OFFER configuration. addOfferLine always
 * overwrites it with offers.customer_name inside the transaction, so this
 * value must never reach the database.
 */
export const OFFER_CONFIG_NAME_PLACEHOLDER = "__offer-config__";
