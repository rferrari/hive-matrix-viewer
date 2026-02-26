import { getHiveBuffer, startHiveStream } from './lib/hiveStream';
import ClientHome from './components/ClientHome';

// Ensure the stream is running globally
startHiveStream();

export default async function Home() {
  // SSR fetches current cache before loading client
  const initialOps = getHiveBuffer();

  return <ClientHome initialOps={initialOps} />;
}
