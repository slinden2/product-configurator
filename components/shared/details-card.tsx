import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DetailsCardProps {
  clientName: string;
  description: string;
  className?: string;
}

const DetailsCard = ({
  clientName,
  description,
  className,
}: DetailsCardProps) => {
  return (
    <Card className={`mb-8${className ? ` ${className}` : ""}`}>
      <CardHeader>
        <CardTitle className="text-2xl">Dettagli</CardTitle>
      </CardHeader>
      <CardContent>
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

export default DetailsCard;
