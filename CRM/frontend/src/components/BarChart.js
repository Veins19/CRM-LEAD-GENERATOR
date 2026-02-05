// CRM/frontend/src/components/BarChart.js

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Title,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

function BarChart({ title = '', labels = [], data = [], color = '#43a6f7' }) {
    const chartData = {
        labels,
        datasets: [
            {
                label: title,
                data,
                backgroundColor: color,
                borderRadius: 7,
                borderWidth: 1
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: {
                display: !!title,
                text: title,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return <Bar data={chartData} options={options} />;
}

export default BarChart;
