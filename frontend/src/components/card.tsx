import '../styles/Card.css'
import React from 'react'

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className }: CardProps) {
    const cardClassName = `card ${className || ''}`.trim()
    return <div className={cardClassName}>{children}</div>
}

export function CardHeader({ children, className }: CardProps) {
    const headerClassName = `card-header ${className || ''}`.trim()
    return <div className={headerClassName}>{children}</div>
}

export function CardTitle({ children, className }: CardProps) {
    const titleClassName = `card-title ${className || ''}`.trim()
    return <h3 className={titleClassName}>{children}</h3>
}

export function CardContent({ children, className }: CardProps) {
    const contentClassName = `card-content ${className || ''}`.trim()
    return <div className={contentClassName}>{children}</div>
}

