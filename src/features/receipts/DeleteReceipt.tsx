import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api, unwrap, type Schemas } from "../../api/client";
import { AcknowledgeBox, Button, ErrorNotice, Notice } from "../../components/ui";
import { formatCents, formatDate, plural } from "../../lib/format";
import { merchantName } from "../../lib/merchants";
import { receiptChanged } from "./cache";
import { FootQuestion } from "./FootQuestion";

/** Delete the purchase and its file, then go to `to`. The edits of the review, if any, go with the purchase. */
export function useDeleteReceipt(receiptId: string, to: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      const res = await api.DELETE("/v1/receipts/{receipt_id}", { params: { path: { receipt_id: receiptId } } });
      if (!res.response.ok) unwrap(res);
    },
    onSuccess: () => {
      void receiptChanged(qc);
      navigate(to, { replace: true, state: { discard: true } });
    },
  });
}

/** The confirmation of «Eliminar»: the same for the button at the foot of the review and for the one of «Ficheiro e dados». */
export function DeleteReceiptNotice({ receiptId, onCancel }: { receiptId: string; onCancel: () => void }) {
  const remove = useDeleteReceipt(receiptId, "/compras");

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
      {remove.error && <ErrorNotice what="eliminar a compra" error={remove.error} />}
    </FootQuestion>
  );
}

/**
 * «Eliminar compra» on a confirmed purchase (spec 021): more layers than a reading that failed, because the purchase counts in the spending.
 * It says what is lost, in numbers, and the safer ways out; the button only turns on after the box is ticked, as in «Eliminar conta».
 */
export function DeleteConfirmedNotice({ receipt: r, onCancel }: { receipt: Schemas["ReceiptOut"]; onCancel: () => void }) {
  const remove = useDeleteReceipt(r.id, "/compras");
  const [understood, setUnderstood] = useState(false);
  const where = [merchantName(r.merchant, r.merchant_name), r.store_label].filter(Boolean).join(", ");

  return (
    <FootQuestion>
      <Notice
        tone="warning"
        title="Eliminar esta compra confirmada?"
        action={
          <>
            <Button variant="danger" disabled={!understood} busy={remove.isPending} onClick={() => remove.mutate()}>
              Eliminar compra
            </Button>
            <Button variant="quiet" disabled={remove.isPending} onClick={onCancel}>
              Cancelar
            </Button>
          </>
        }
      >
        <p className="font-medium">
          {where}, {formatDate(r.purchase_at)}: {plural(r.lines.length, "produto", "produtos")} e {formatCents(r.totals.recalculated_total_cents)}.
        </p>
        <p className="mt-2">Deixa de contar no Resumo, em Produtos e na meta do mês, e o ficheiro original também é apagado. Não é possível desfazer.</p>
        <p className="mt-2">Para corrigir um valor, use «Editar talão». Para guardar a compra sem a imagem, use «Apagar só o ficheiro».</p>
        <AcknowledgeBox checked={understood} onChange={setUnderstood}>
          Compreendo que esta compra e o ficheiro serão apagados e que não é possível recuperá-los.
        </AcknowledgeBox>
      </Notice>
      {remove.error && <ErrorNotice what="eliminar a compra" error={remove.error} />}
    </FootQuestion>
  );
}
