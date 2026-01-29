import React, { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import './Table.css'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  striped?: boolean
  hoverable?: boolean
  compact?: boolean
  bordered?: boolean
}

export const Table: React.FC<TableProps> = ({
  striped = false,
  hoverable = true,
  compact = false,
  bordered = false,
  children,
  className = '',
  ...props
}) => {
  const classes = [
    'table',
    striped && 'table-striped',
    hoverable && 'table-hoverable',
    compact && 'table-compact',
    bordered && 'table-bordered',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className="table-wrapper">
      <table className={classes} {...props}>
        {children}
      </table>
    </div>
  )
}

export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableHead: React.FC<TableHeadProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <thead className={`table-head ${className}`} {...props}>
      {children}
    </thead>
  )
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody className={`table-body ${className}`} {...props}>
      {children}
    </tbody>
  )
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
}

export const TableRow: React.FC<TableRowProps> = ({
  selected = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <tr className={`table-row ${selected ? 'selected' : ''} ${className}`} {...props}>
      {children}
    </tr>
  )
}

export interface TableHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  sortable = false,
  sortDirection = null,
  onSort,
  children,
  className = '',
  ...props
}) => {
  return (
    <th
      className={`table-header ${sortable ? 'sortable' : ''} ${className}`}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="table-header-content">
        {children}
        {sortable && (
          <span className={`sort-icon ${sortDirection || ''}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4l4 4H4l4-4z" className="sort-asc" />
              <path d="M8 12l4-4H4l4 4z" className="sort-desc" />
            </svg>
          </span>
        )}
      </div>
    </th>
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <td className={`table-cell ${className}`} {...props}>
      {children}
    </td>
  )
}
