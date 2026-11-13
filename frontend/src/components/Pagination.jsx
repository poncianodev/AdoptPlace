export default function Pagination({ page, meta, onChange }) {
  if (!meta || !meta.last_page || meta.last_page <= 1) return null

  return (
    <nav className="register-actions pagination" aria-label="Paginação">
      <button
        type="button"
        className="button button-outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span aria-current="page">
        Página {page} de {meta.last_page}
      </span>
      <button
        type="button"
        className="button button-outline"
        disabled={page >= meta.last_page}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  )
}

