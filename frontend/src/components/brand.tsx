import Image from 'next/image';
export function Brand() {
  return <Image src="/assets/eagles-unbound-logo.png" alt="Eagles Unbound" width={267} height={105} className="brand-image" priority />;
}
