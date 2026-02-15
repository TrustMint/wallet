
import React from 'react';
import { Order } from '../../../types';
import { OrderCardLayout } from '../../shared/OrderCardLayout';

interface CourierOrderCardProps {
  order: Order;
  onClick: () => void;
  distance?: string; // Distance string (e.g. "2.5")
}

export const CourierOrderCard: React.FC<CourierOrderCardProps> = ({ order, onClick, distance }) => {
  return (
    <OrderCardLayout
        order={order}
        onClick={onClick}
        displayPrice={order.price}
        statusBadge={null} 
        isNegotiating={false}
        distance={distance}
    />
  );
};
