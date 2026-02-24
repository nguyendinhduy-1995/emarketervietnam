'use client';

import React from 'react';

interface PageTitleProps {
    title: string;
    subtitle?: string;
    icon?: string;
    breadcrumb?: { label: string; href?: string }[];
    actions?: React.ReactNode;
}

export default function PageTitle({ title, subtitle, icon, breadcrumb, actions }: PageTitleProps) {
    return (
        <div className="admin-page-title">
            {breadcrumb && breadcrumb.length > 0 && (
                <nav className="admin-page-title__breadcrumb">
                    {breadcrumb.map((b, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="admin-page-title__breadcrumb-sep">›</span>}
                            {b.href ? (
                                <a href={b.href} className="admin-page-title__breadcrumb-link">{b.label}</a>
                            ) : (
                                <span className="admin-page-title__breadcrumb-current">{b.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
            <div className="admin-page-title__row">
                <div className="admin-page-title__text">
                    <h1 className="admin-page-title__heading">
                        {icon && <span className="admin-page-title__icon">{icon}</span>}
                        {title}
                    </h1>
                    {subtitle && <p className="admin-page-title__subtitle">{subtitle}</p>}
                </div>
                {actions && <div className="admin-page-title__actions">{actions}</div>}
            </div>
        </div>
    );
}
