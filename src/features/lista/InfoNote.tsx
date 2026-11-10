import { Button } from "../../components/ui";

/**
 * G3: what the house means and where the values come from. It says what exists today (the person's own receipts, and the
 * last price paid at another supermarket when the chosen one has none) and is to be validated at the end of the work.
 */
export function InfoNote({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div id={id} className="flex flex-col gap-3 rounded-surface bg-brand-soft p-4 text-sm leading-relaxed">
      <section>
        <h2 className="font-bold">A casinha</h2>
        <p>Marca um produto que já tem em casa. Fica na lista para ver o preço esperado e não entra na estimativa, a menos que o ponha no carrinho.</p>
      </section>
      <section>
        <h2 className="font-bold">De onde vêm os valores</h2>
        <p>
          O preço esperado é o último que pagou por este produto, nos seus talões, no supermercado escolhido. Se nunca comprou lá, mostramos o último
          que pagou noutro supermercado, assinalado com «~». Sem dados, fica em branco. Não são preços de hoje na loja.
        </p>
      </section>
      <Button variant="outline" className="self-start" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}
