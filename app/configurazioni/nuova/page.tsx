import { redirect } from "next/navigation";
import FormContainer from "@/components/form-container";
import { getUserData } from "@/db/queries";

const NewConfiguration = async () => {
  const user = await getUserData();
  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Nuova configurazione</h1>
        <p className="text-muted-foreground">
          Compila il form sottostante per creare una nuova configurazione per il
          tuo cliente.
        </p>
      </div>
      <FormContainer />
    </div>
  );
};

export default NewConfiguration;
