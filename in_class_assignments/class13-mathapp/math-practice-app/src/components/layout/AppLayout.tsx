import { Outlet } from "react-router";
import StorageWarning from "../common/StorageWarning";
import Header from "./Header";
import PageContainer from "./PageContainer";
import PlayfulBackground from "./PlayfulBackground";

export default function AppLayout() {
  return (
    <>
      <PlayfulBackground />
      <Header />
      <PageContainer>
        <StorageWarning />
        <Outlet />
      </PageContainer>
    </>
  );
}
