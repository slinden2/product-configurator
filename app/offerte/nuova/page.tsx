import { redirect } from "next/navigation";
import { getUserData } from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import OfferForm from "./offer-form";

const NewOffer = async () => {
  const user = await getUserData();
  if (!user) redirect("/login");
  if (!canViewOffer(user.role)) redirect("/");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Nuova offerta</h1>
        <p className="text-muted-foreground">
          Inserisci i dati del cliente. Il numero offerta viene assegnato
          automaticamente.
        </p>
      </div>
      <OfferForm />
    </div>
  );
};

export default NewOffer;
