import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

interface MetaDataTableProps {
  clientName: string;
  description: string;
}

const MetaDataTable = ({ clientName, description }: MetaDataTableProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl">Dettagli</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Nome del cliente
            </div>
            <div className="text-lg">{clientName}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Descrizione
            </div>
            <div className="text-lg">{description}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetaDataTable;
