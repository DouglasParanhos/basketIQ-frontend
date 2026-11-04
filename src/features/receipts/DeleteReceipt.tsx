import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api, unwrap } from "../../api/client";
import { Button, Notice } from "../../components/ui";
import { invalidateReceiptData } from "./cache";
import { FootQuestion } from "./FootQuestion";

/** The confirmation of «Eliminar»: the same for the button at the foot of the review and for the one of «Ficheiro e dados». */
export function DeleteReceiptNotice({ receiptId, onCancel }: { receiptId: string; onCancel: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: async () => {
      const res = await api.DELETE("/v1/receipts/{receipt_id}", { params: { path: { receipt_id: receiptId } } });
      if (!res.response.ok) unwrap(res);
    },
    onSuccess: () => {
      void invalidateReceiptData(qc);
      void qc.invalidateQueries({ queryKey: ["summary"] });
      navigate("/compras", { replace: true, state: { discard: true } }); // the edits of the review, if any, go with the purchase
    },
  });

  return (
    <FootQuestion>
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
    </FootQuestion>
  );
}
