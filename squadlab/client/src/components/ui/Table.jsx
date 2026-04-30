import React from 'react';

const Table = ({ headers, children, className = '' }) => {
  return (
    <div className={`overflow-x-auto w-full ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
