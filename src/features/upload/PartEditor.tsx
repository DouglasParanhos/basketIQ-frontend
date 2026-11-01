import { useEffect, useRef } from "react";
import { Button } from "../../components/ui";
import type { Edit } from "./edit";
import { ImageEditor } from "./ImageEditor";
import type { Part } from "./photos";

/** The editor of one part, in place of the list. The title takes the focus; «Concluir» goes back to the list with the edit kept. */
export function PartEditor({ part, index, onChange, onDone }: { part: Part; index: number; onChange: (edit: Edit) => void; onDone: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  return (
    <section className="flex flex-col gap-4">
      <h2 ref={title} tabIndex={-1} className="text-lg font-bold">
        Recortar a parte {index + 1}
      </h2>
      {part.previewUrl && <ImageEditor src={part.previewUrl} value={part.edit} onChange={onChange} />}
      <Button type="button" onClick={onDone}>
        Concluir
      </Button>
    </section>
  );
}
