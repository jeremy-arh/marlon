'use client';

import { useRouter } from 'next/navigation';

export default function ViewOrdersButton() {
  const router = useRouter();

  const handleClick = async () => {
    await router.push('/orders');
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      className="block w-full py-3 bg-marlon-green text-white font-semibold rounded-lg hover:bg-marlon-green/90 transition-colors"
    >
      Voir mes commandes
    </button>
  );
}
