import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { Users } from 'lucide-react';

export function WeeklyActiveUsers({ data, isLoading }) {
  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-primary mb-1">Weekly active users</h3>
          <EmptyState icon={Users} />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    week: d.week.replace(/^\d{4}-/, ''),
    users: d.unique_user_count,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="font-semibold">Week {label}</p>
        <p>{payload[0].value} unique users</p>
      </div>
    );
  };

  const totalAvg = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.users, 0) / chartData.length)
    : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary mb-1">Weekly active users</h3>
            <p className="text-sm text-primary/50">User login sessions per week</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalAvg}</p>
            <p className="text-xs text-primary/50">avg/week</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="wauGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4A0E17" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#4A0E17" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 14, 23, 0.08)" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#4A0E17', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(74, 14, 23, 0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#4A0E17', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="users"
              fill="url(#wauGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#4A0E17"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#4A0E17', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#4A0E17', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
