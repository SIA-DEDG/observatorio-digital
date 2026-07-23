import { Building2, Info } from "lucide-react";

export default function Card({ title, multi, description, value, unit, color = "#0E50A6", icon: Icon = Building2 }) {
    return (
        <div className="flex h-auto min-h-[70px] min-w-[104px] grow shrink-0 basis-auto items-center gap-2 rounded-[8px] border border-[#cbcbcb] bg-white px-2 py-1 shadow-[2px_2px_2px_rgba(0,0,0,0.25),0_3px_4px_-1px_rgba(0,0,0,0.18)]">
            <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#e3e8fe]">
                <Icon size={11} style={{ color }} />
            </div>

            <div className="flex shrink-0 items-stretch gap-2">
                <StatItem value={unit ? `${value} ${unit}` : value} label={title} large />

                {multi && description?.length > 0 &&
                    description.map((item) => (
                        <div key={item.label} className="contents">
                            <Divider />
                            <StatItem
                                value={item.unit ? `${item.value} ${item.unit}` : item.value}
                                label={item.label}
                                caption={item.caption}
                            />
                        </div>
                    ))}
            </div>
        </div>
    );
}


function StatItem({ value, label, caption, large }) {
    return (
        <div className="flex shrink-0 flex-col items-start gap-0.5 whitespace-nowrap">
            <div className="flex items-start gap-[4px]">
                <p className={` leading-tight ${large ? "text-[12px] font-semibold" : "text-[10px] font-normal"}`}>
                    {label}
                </p>
                {caption && (
                    <span className="group relative ml-auto self-start">
                        <Info size={11} className="text-grey-400" />
                        <span role="tooltip"
                            className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-40 rounded-md
                         bg-[#232323] px-2 py-1 text-[10px] font-normal text-white shadow-lg
                         group-hover:block">
                            {caption}
                        </span>
                    </span>
                )}

            </div>
            <p className={`text-[#232323] leading-tight ${large ? "text-[15px] font-bold" : "text-[12px] font-semibold"}`}>
                {value}
            </p>
        </div>
    );
}

function Divider() {
    return <div className="w-px self-stretch shrink-0 bg-[#cbcbcb]" />
}
