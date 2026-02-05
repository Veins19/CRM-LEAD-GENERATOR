// CRM/frontend/src/components/LineChart.js

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Title,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

function LineChart({ title = '', labels = [], data = [], color = '#43a6f7' }) {
    const chartData = {
        labels,
        datasets: [
            {
                label: title,
                data,
                fill: false,
                borderColor: color,
                backgroundColor: color + '50',
                tension: 0.2,
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

    return <Line data={chartData} options={options} />;
}

export default LineChart;
