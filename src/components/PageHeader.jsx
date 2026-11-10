// The title block at the top of each page.
export default function PageHeader({ title, children }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      {children && <p className="mt-2 max-w-2xl text-muted">{children}</p>}
    </div>
  )
}
