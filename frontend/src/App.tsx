import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import './App.css'

type Person = {
  id: string
  name: string
  age: number
  canRegisterExpense: boolean
  canRegisterIncome: boolean
}

type Transaction = {
  id: string
  descricao: string
  valor: number
  tipo: TransactionType
  pessoaId: string
  pessoaNome: string
}

type TransactionType = 'despesa' | 'receita'

type PersonForm = {
  name: string
  age: string
}

type TransactionForm = {
  descricao: string
  valor: string
  tipo: TransactionType
  pessoaId: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5080'
const emptyPersonForm: PersonForm = { name: '', age: '' }
const emptyTransactionForm: TransactionForm = {
  descricao: '',
  valor: '',
  tipo: 'despesa',
  pessoaId: '',
}

function App() {
  const [people, setPeople] = useState<Person[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [personForm, setPersonForm] = useState<PersonForm>(emptyPersonForm)
  const [transactionForm, setTransactionForm] = useState<TransactionForm>(emptyTransactionForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoadingPeople, setIsLoadingPeople] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [isSavingPerson, setIsSavingPerson] = useState(false)
  const [isSavingTransaction, setIsSavingTransaction] = useState(false)
  const [personMessage, setPersonMessage] = useState('')
  const [transactionMessage, setTransactionMessage] = useState('')

  const totalPeople = useMemo(() => people.length, [people])
  const totalTransactions = useMemo(() => transactions.length, [transactions])

  async function loadPeople() {
    setIsLoadingPeople(true)
    setPersonMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/people`)
      if (!response.ok) {
        throw new Error('Nao foi possivel carregar as pessoas.')
      }

      setPeople(await response.json())
    } catch (error) {
      setPersonMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsLoadingPeople(false)
    }
  }

  async function loadTransactions() {
    setIsLoadingTransactions(true)
    setTransactionMessage('')

    try {
      const response = await fetch(`${apiUrl}/api/transactions`)
      if (!response.ok) {
        throw new Error('Nao foi possivel carregar as transacoes.')
      }

      setTransactions(await response.json())
    } catch (error) {
      setTransactionMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  async function loadAll() {
    await Promise.all([loadPeople(), loadTransactions()])
  }

  useEffect(() => {
    void loadAll()
  }, [])

  function updatePersonField(field: keyof PersonForm, value: string) {
    setPersonForm((current) => ({ ...current, [field]: value }))
  }

  function updateTransactionField(field: keyof TransactionForm, value: string) {
    setTransactionForm((current) => ({ ...current, [field]: value }))
  }

  function startEditing(person: Person) {
    setEditingId(person.id)
    setPersonForm({
      name: person.name,
      age: String(person.age),
    })
    setPersonMessage('')
  }

  function cancelEditing() {
    setEditingId(null)
    setPersonForm(emptyPersonForm)
    setPersonMessage('')
  }

  async function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingPerson(true)
    setPersonMessage('')

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `${apiUrl}/api/people/${editingId}` : `${apiUrl}/api/people`
    const payload = {
      ...personForm,
      age: Number(personForm.age),
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

      setPersonForm(emptyPersonForm)
      setEditingId(null)
      await loadPeople()
      setPersonMessage(editingId ? 'Pessoa atualizada.' : 'Pessoa cadastrada.')
    } catch (error) {
      setPersonMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsSavingPerson(false)
    }
  }

  async function deletePerson(id: string) {
    setPersonMessage('')

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

      await loadAll()
      setPersonMessage('Pessoa removida.')
    } catch (error) {
      setPersonMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    }
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingTransaction(true)
    setTransactionMessage('')

    const payload = {
      ...transactionForm,
      valor: Number(transactionForm.valor),
    }

    try {
      const response = await fetch(`${apiUrl}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.message ?? 'Nao foi possivel cadastrar a transacao.')
      }

      setTransactionForm(emptyTransactionForm)
      await loadTransactions()
      setTransactionMessage('Transacao cadastrada.')
    } catch (error) {
      setTransactionMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsSavingTransaction(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Gestao residencial</span>
          <h1>Cadastros</h1>
        </div>
        <button className="icon-button" type="button" onClick={loadAll} aria-label="Atualizar dados">
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="summary-band">
        <div>
          <span className="summary-label">Pessoas cadastradas</span>
          <strong>{totalPeople}</strong>
        </div>
        <div>
          <span className="summary-label">Transacoes cadastradas</span>
          <strong>{totalTransactions}</strong>
        </div>
        <p>Menores de 18 anos podem cadastrar despesas, mas nao podem cadastrar receitas.</p>
      </section>

      <section className="workspace">
        <form className="entry-form" onSubmit={savePerson}>
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
              value={personForm.name}
              onChange={(event) => updatePersonField('name', event.target.value)}
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
              value={personForm.age}
              onChange={(event) => updatePersonField('age', event.target.value)}
              placeholder="Ex.: 32"
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSavingPerson}>
            {editingId ? <Check size={18} /> : <Plus size={18} />}
            {isSavingPerson ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Cadastrar pessoa'}
          </button>

          {personMessage && <p className="status-message">{personMessage}</p>}
        </form>

        <div className="data-panel">
          <div className="panel-heading">
            <h2>Pessoas</h2>
            {isLoadingPeople && <span>Carregando...</span>}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Idade</th>
                  <th>Permissoes</th>
                  <th aria-label="Acoes"></th>
                </tr>
              </thead>
              <tbody>
                {!isLoadingPeople && people.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      Nenhuma pessoa cadastrada.
                    </td>
                  </tr>
                )}

                {people.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.age}</td>
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

      <section className="workspace">
        <form className="entry-form" onSubmit={saveTransaction}>
          <div className="form-heading">
            <h2>Nova transacao</h2>
          </div>

          <label>
            Descricao
            <input
              required
              value={transactionForm.descricao}
              onChange={(event) => updateTransactionField('descricao', event.target.value)}
              placeholder="Ex.: Mercado"
            />
          </label>

          <label>
            Valor
            <input
              required
              min={0.01}
              step={0.01}
              type="number"
              value={transactionForm.valor}
              onChange={(event) => updateTransactionField('valor', event.target.value)}
              placeholder="Ex.: 120.50"
            />
          </label>

          <label>
            Tipo
            <select
              required
              value={transactionForm.tipo}
              onChange={(event) => updateTransactionField('tipo', event.target.value)}
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </label>

          <label>
            Pessoa
            <select
              required
              value={transactionForm.pessoaId}
              onChange={(event) => updateTransactionField('pessoaId', event.target.value)}
            >
              <option value="">Selecione uma pessoa</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} - {person.age} anos
                </option>
              ))}
            </select>
          </label>

          <button className="primary-button" type="submit" disabled={isSavingTransaction || people.length === 0}>
            <Plus size={18} />
            {isSavingTransaction ? 'Salvando...' : 'Cadastrar transacao'}
          </button>

          {transactionMessage && <p className="status-message">{transactionMessage}</p>}
        </form>

        <div className="data-panel">
          <div className="panel-heading">
            <h2>Transacoes</h2>
            {isLoadingTransactions && <span>Carregando...</span>}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descricao</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th>Pessoa</th>
                </tr>
              </thead>
              <tbody>
                {!isLoadingTransactions && transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      Nenhuma transacao cadastrada.
                    </td>
                  </tr>
                )}

                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.descricao}</td>
                    <td>{formatCurrency(transaction.valor)}</td>
                    <td>
                      <span className={transaction.tipo === 'receita' ? 'permission allowed' : 'permission neutral'}>
                        {transaction.tipo}
                      </span>
                    </td>
                    <td>{transaction.pessoaNome}</td>
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default App
