import { Scale, List } from 'lucide-react'

const OPTIONS = [
    { key: 'balanca-comercial', label: 'Balança Comercial', icon: Scale },
    { key: 'detalhamento', label: 'Detalhamento', icon: List },
]

export default function LevelToggle({ value, onChange, options = OPTIONS }) {
    const activeIndex = Math.max(0, options.findIndex((option) => option.key === value))

    return (
        <div
            className="relative grid rounded-full bg-superficie-3 p-1"
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            <span
                aria-hidden="true"
                className="absolute bottom-1 left-1 top-1 rounded-full bg-primary transition-transform duration-700 ease-in-out"
                style={{
                    width: `calc((100% - 0.5rem) / ${options.length})`,
                    transform: `translateX(${activeIndex * 100}%)`,
                }}
            />
            {options.map((option, index) => {
                const Icon = option.icon
                const active = index === activeIndex
                return (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => onChange(option.key)}
                        className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12px] transition-colors duration-700 ${active ? 'font-medium text-texto-sobre-marca' : 'font-normal text-texto-3'}`}
                    >
                        {Icon && <Icon size={13} />}
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
