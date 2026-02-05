// CRM/frontend/src/components/PieChart.js

import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    Title
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const presetColors = [
    '#43a6f7', '#a7d129', '#ffc857', '#ff595e', '#eb596e', '#2b2d42', '#fdc57b', '#b388eb'
];

function PieChart({ title = '', labels = [], data = [], colors = presetColors }) {
    const chartData = {
        labels,
        datasets: [
            {
                data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'right' },
            title: {
                display: !!title,
                text: title,
            },
        },
    };

    return <Pie data={chartData} options={options} />;
}

export default PieChart;
