# Rumbo · Brand kit "café con leche"

## Idea
**Rumbo** es la dirección que tomas. Buscar trabajo cansa y angustia; Rumbo tiene que sentirse como
una mesa de café tranquila: cálido, ordenado y de tu lado. La marca es una brújula que encuentra el norte.

- **Frase:** Tu búsqueda de trabajo en piloto automático.
- **Tono:** cercano, honesto y simple. Habla de "tú". Celebra avances concretos ("3 empresas te
  respondieron") y nunca promete lo que no controla ("vas a conseguir trabajo").

## Logo
Una brújula circular color espresso con un anillo punteado latte y una aguja: la mitad norte rellena en
caramelo, la mitad sur solo con contorno crema. Al abrir la app, **la aguja gira, duda y se asienta
apuntando al norte**: Rumbo encontró tu dirección.

- Archivo estático: `ui/public/logo.svg` (se copia a `rumbo/web/logo.svg`).
- Componente animado: `ui/src/Logo.tsx`.
- Logotipo: la palabra **rumbo** en minúscula, en la tipografía de títulos, junto al símbolo. El logo
  definitivo se elige en el brand kit interactivo (`/brandkit.html`, 12 conceptos nuevos + 5 de la primera ronda).
- Espacio libre alrededor del símbolo: al menos la mitad de su radio. Tamaño mínimo: 20 px.

## Color
| Nombre | Hex | Uso |
|---|---|---|
| Crema | `#FAF6F0` | Fondo general |
| Leche | `#FFFDF9` | Tarjetas y paneles |
| Avena | `#F2E9DD` | Superficies suaves, columnas del tablero, hover |
| Latte | `#E6D5C1` | Bordes fuertes, anillo del logo |
| Caramelo | `#E8B98F` | Acento de marca: aguja, barras, resaltados |
| Café | `#8B5E3C` | Acción principal (botones, enlaces, foco) |
| Café hondo | `#6F4A2F` | Hover de la acción principal |
| Espresso | `#3B2A20` | Logo, títulos, navegación activa |
| Tinta | `#2E2219` | Texto principal |
| Moca | `#7A6656` | Texto secundario |
| Línea | `#ECE2D6` | Bordes y separadores |
| Salvia | `#7FAE8A` | Éxito: respondió, entrevista |
| Durazno | `#E8A87C` | Atención: requiere sesión, revisar |
| Arcilla | `#C96B5C` | Error |

Regla: crema y leche dominan; el café y el caramelo aparecen en acciones y datos. Los colores de estado
solo en etiquetas pequeñas.

## Tipografía
- Provisoria en la app: **Bricolage Grotesque** (títulos y números) + **Hanken Grotesk** (interfaz), ambas OFL.
- La definitiva se elige entre las 12 parejas del brand kit (`/brandkit.html`).
- Regla fija: **cero degradados** en toda la interfaz. Colores planos.
- Ambas vienen empaquetadas con la app (no dependen de internet).
- Cifras con `font-variant-numeric: tabular-nums`.

## Forma
- Radio 18 px en paneles, 12 px en campos, píldora en botones y etiquetas.
- Sombras suaves y cálidas (`rgba(59, 42, 32, .06)`), nunca grises frías.
- Aire generoso: 22 a 24 px de margen interno.

## Movimiento
Las animaciones vienen de [React Bits](https://reactbits.dev) (MIT + Commons Clause) y de Motion:

| Dónde | Componente |
|---|---|
| Títulos de cada página | BlurText (las palabras aparecen desenfocadas y se enfocan) |
| Números del resumen | CountUp |
| Paneles | SpotlightCard (un halo caramelo sigue al mouse) y AnimatedContent (entrada suave) |
| Bienvenida | Grainient (fondo de grano café en movimiento), Stepper, RotatingText y ShinyText |
| Clientes por correo | GlareHover en las tarjetas de segmento |
| Fuentes | SquishSwitch |
| Barra lateral | StatusMark (estado del motor), ClickSpark en "Buscar ahora", fondo activo con layout animado |

Regla: el movimiento orienta (algo entró, algo cambió), nunca distrae. Duraciones entre 0,2 y 1,2 s, con
curva `[0.22, 1, 0.36, 1]`.
