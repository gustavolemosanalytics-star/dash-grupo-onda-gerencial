# Frontend - Dashboard React

Frontend do dashboard em **React 19 + TypeScript + Tailwind CSS**.

## Stack

- **React 19** - Biblioteca UI
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilização
- **React Query** - Cache e sincronização de dados
- **Recharts** - Gráficos e visualizações
- **React Router** - Roteamento
- **Vite** - Build tool e dev server
- **Framer Motion** - Animações

## Estrutura

```
src/
├── pages/              # Páginas do dashboard
│   ├── Bar/           # Página de consumo do bar
│   │   ├── hooks/     # useBarData.ts, etc.
│   │   └── components/ # Componentes específicos
│   ├── VendasIngresso/ # Página de vendas
│   │   ├── hooks/
│   │   └── components/
│   └── VisaoGeral/    # Dashboard geral
├── services/          # Cliente API
│   └── api.ts        # Endpoints centralizados
├── types/            # TypeScript types
│   ├── bar.ts
│   └── vendas.ts
├── components/       # Componentes compartilhados
├── features/         # Features reutilizáveis
└── lib/             # Utilitários e helpers
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar dev server
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

## Configuração da API

O frontend se conecta ao backend Python FastAPI em `http://localhost:4000`.

Para alterar a URL da API, edite [src/services/api.ts](src/services/api.ts:1):

```typescript
const API_BASE_URL = 'http://localhost:4000/api'
```

## Padrões de Código

### Hooks Customizados

Cada página tem seus próprios hooks para buscar dados:

```typescript
// pages/Bar/hooks/useBarData.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../services/api'

export const useBarData = () => {
  return useQuery({
    queryKey: ['barData'],
    queryFn: api.bar.getAll,
    staleTime: 60000,
  })
}
```

### Componentes

Componentes funcionais com TypeScript:

```typescript
interface Props {
  title: string
  value: number
}

export function MetricCard({ title, value }: Props) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  )
}
```

### Estilização

Tailwind CSS com classes utilitárias:

```tsx
<div className="rounded-3xl border border-white/5 bg-white/5 p-6">
  <h2 className="text-lg font-semibold text-white">Título</h2>
</div>
```

## Build

```bash
npm run build
```

O build será gerado em `dist/` e pode ser deployado em:
- Netlify
- Vercel
- Cloudflare Pages
- AWS S3 + CloudFront
