import { getHiveSnapshot, startHiveStream } from './lib/hiveStream';
import ClientHome from './components/ClientHome';

// Ensure the stream is running globally
startHiveStream();

export default async function Home() {
  // SSR fetches current snapshot before loading client
  const initialData = getHiveSnapshot();

  return <ClientHome initialData={initialData} />;
}
