import { redirect } from "next/navigation";
import FormContainer from "@/components/form-container";
import { getUserData } from "@/db/queries";
import { canManageStandaloneConfigs } from "@/lib/access";

const NewConfiguration = async () => {
  const user = await getUserData();
  if (!user) redirect("/login");

  // Standalone configs are Engineer/Admin only; sales create configs from offers.
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
