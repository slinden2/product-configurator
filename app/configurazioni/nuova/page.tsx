import { redirect } from "next/navigation";
import FormContainer from "@/components/form-container";
import { getOfferWithRevisionAndLines, getUserData } from "@/db/queries";
import { canManageStandaloneConfigs, canViewOffer } from "@/lib/access";

const NewConfiguration = async (props: {
  searchParams: Promise<{ offerId?: string }>;
}) => {
  const user = await getUserData();
  if (!user) redirect("/login");

  const { offerId: offerIdParam } = await props.searchParams;
  const offerId = offerIdParam ? parseInt(offerIdParam, 10) : undefined;

  // Offer-line creation: open the shared ConfigForm bound to an offer the user
  // can edit. The created config is parented to the offer (origin=OFFER) on save.
  if (offerId !== undefined && !Number.isNaN(offerId)) {
    if (!canViewOffer(user.role)) redirect("/");
    const offer = await getOfferWithRevisionAndLines(offerId, user);
    // Out of scope, missing, revision no longer DRAFT, or a post-acceptance
    // renegotiation (also DRAFT, but its line set is locked — addOfferLine would
    // throw renegotiationLinesLocked) → back to offers.
    if (
      !offer ||
      offer.revisions[0]?.status !== "DRAFT" ||
      offer.accepted_revision_id !== null
    ) {
      redirect("/offerte");
    }

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Nuova configurazione offerta
          </h1>
          <p className="text-muted-foreground">
            Compila il form per aggiungere una configurazione all'offerta{" "}
            {offer.offer_number}.
          </p>
        </div>
        <FormContainer
          offerId={offerId}
          offerCustomerName={offer.customer_name}
        />
      </div>
    );
  }

  // Standalone technical config: Engineer/Admin only; sales create from offers.
  if (!canManageStandaloneConfigs(user.role)) redirect("/");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Nuova configurazione tecnica
        </h1>
        <p className="text-muted-foreground">
          Compila il form sottostante per creare una nuova configurazione
          tecnica autonoma.
        </p>
      </div>
      <FormContainer />
    </div>
  );
};

export default NewConfiguration;
