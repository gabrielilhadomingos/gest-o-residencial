import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import './App.css'

type Person = {
  id: string
  name: string
  age: number
  email: string | null
  phone: string | null
  createdAt: string
  canRegisterExpense: boolean
  canRegisterIncome: boolean
}

type PersonForm = {
  name: string
  age: string
  email: string
  phone: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5080'
const emptyForm: PersonForm = { name: '', age: '', email: '', phone: '' }

function App() {
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState<PersonForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const totalPeople = useMemo(() => people.length, [people])

  async function loadPeople() {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/people`)
      if (!response.ok) {
        throw new Error('Nao foi possivel carregar as pessoas.')
      }

      setPeople(await response.json())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPeople()
  }, [])

  function updateField(field: keyof PersonForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function startEditing(person: Person) {
    setEditingId(person.id)
    setForm({
      name: person.name,
      age: String(person.age),
      email: person.email ?? '',
      phone: person.phone ?? '',
    })
    setMessage('')
  }

  function cancelEditing() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  async function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `${apiUrl}/api/people/${editingId}` : `${apiUrl}/api/people`
    const payload = {
      ...form,
      age: Number(form.age),
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.message ?? 'Nao foi possivel salvar a pessoa.')
      }

      setForm(emptyForm)
      setEditingId(null)
      await loadPeople()
      setMessage(editingId ? 'Pessoa atualizada.' : 'Pessoa cadastrada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePerson(id: string) {
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/people/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Nao foi possivel remover a pessoa.')
      }

      if (editingId === id) {
        cancelEditing()
      }

      await loadPeople()
      setMessage('Pessoa removida.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Gestao residencial</span>
          <h1>Cadastro de pessoas</h1>
        </div>
        <button className="icon-button" type="button" onClick={loadPeople} aria-label="Atualizar lista">
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="summary-band">
        <div>
          <span className="summary-label">Pessoas cadastradas</span>
          <strong>{totalPeople}</strong>
        </div>
        <p>Use este cadastro para vincular moradores, familiares ou participantes aos gastos depois.</p>
      </section>

      <section className="workspace">
        <form className="person-form" onSubmit={savePerson}>
          <div className="form-heading">
            <h2>{editingId ? 'Editar pessoa' : 'Nova pessoa'}</h2>
            {editingId && (
              <button className="text-button" type="button" onClick={cancelEditing}>
                <X size={16} />
                Cancelar
              </button>
            )}
          </div>

          <label>
            Nome
            <input
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Ex.: Ana Silva"
            />
          </label>

          <label>
            Idade
            <input
              required
              min={0}
              max={130}
              type="number"
              value={form.age}
              onChange={(event) => updateField('age', event.target.value)}
              placeholder="Ex.: 32"
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="ana@email.com"
            />
          </label>

          <label>
            Telefone
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="(11) 99999-0000"
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSaving}>
            {editingId ? <Check size={18} /> : <Plus size={18} />}
            {isSaving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Cadastrar pessoa'}
          </button>
        </form>

        <div className="people-panel">
          <div className="panel-heading">
            <h2>Pessoas</h2>
            {isLoading && <span>Carregando...</span>}
          </div>

          {message && <p className="status-message">{message}</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Idade</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Permissoes</th>
                  <th aria-label="Acoes"></th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && people.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Nenhuma pessoa cadastrada.
                    </td>
                  </tr>
                )}

                {people.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.age}</td>
                    <td>{person.email ?? '-'}</td>
                    <td>{person.phone ?? '-'}</td>
                    <td>
                      <div className="permission-list">
                        <span className="permission allowed">Despesa</span>
                        <span className={person.canRegisterIncome ? 'permission allowed' : 'permission blocked'}>
                          Receita
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => startEditing(person)} aria-label={`Editar ${person.name}`}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => deletePerson(person.id)} aria-label={`Remover ${person.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
