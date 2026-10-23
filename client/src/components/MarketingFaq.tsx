export default function MarketingFaq({
  items,
}: {
  items: readonly { q: string; a: string }[];
}) {
  return (
    <div className="marketing-faq">
      {items.map(item => (
        <details key={item.q}>
          <summary>
            {item.q}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
