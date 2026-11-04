import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { api, unwrap } from "../../api/client";
import { Button, Notice } from "../../components/ui";
import { invalidateReceiptData } from "./cache";

/** The confirmation of «Eliminar»: the same for the button at the foot of the review and for the one of «Ficheiro e dados». */
export function DeleteReceiptNotice({ receiptId, onCancel }: { receiptId: string; onCancel: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const remove = useMutation({
    mutationFn: async () => {
      const res = await api.DELETE("/v1/receipts/{receipt_id}", { params: { path: { receipt_id: receiptId } } });
      if (!res.response.ok) unwrap(res);
    },
    onSuccess: () => {
      void invalidateReceiptData(qc);
      void qc.invalidateQueries({ queryKey: ["summary"] });
      navigate("/compras", { replace: true });
    },
  });
  // The button that opened it is gone or far away: the question takes the focus (and so is read out and brought into view).
  useEffect(() => ref.current?.focus(), []);

  return (
    <div ref={ref} tabIndex={-1} className="flex flex-col gap-3 outline-none">
      <Notice
        tone="warning"
        title="Eliminar esta compra?"
        action={
          <>
            <Button variant="danger" busy={remove.isPending} onClick={() => remove.mutate()}>
              Eliminar compra
            </Button>
            <Button variant="quiet" onClick={onCancel}>
              Cancelar
            </Button>
          </>
        }
      >
        A compra e o ficheiro são apagados e deixam de contar no resumo. Não é possível desfazer.
      </Notice>
      {remove.error && <Notice tone="error">{remove.error.message}</Notice>}
    </div>
  );
}
