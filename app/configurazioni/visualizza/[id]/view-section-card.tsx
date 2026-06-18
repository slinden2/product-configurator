import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ViewSection } from "@/lib/configuration/build-config-view-model";

interface ViewSectionCardProps {
  section: ViewSection;
}

/** Read-only card rendering a configuration view section as label/value rows. */
const ViewSectionCard = ({ section }: ViewSectionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {section.groups.map((group) => (
          <div key={group.title ?? "main"}>
            {group.title && (
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {group.title}
              </h3>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.rows.map((field, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are static and positional; labels can repeat within a section (e.g. pump outlets)
                <div key={index} className="flex flex-col">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="text-base">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ViewSectionCard;
