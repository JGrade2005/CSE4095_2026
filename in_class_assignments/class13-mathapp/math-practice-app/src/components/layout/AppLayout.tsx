import { Outlet } from "react-router";
import StorageWarning from "../common/StorageWarning";
import Header from "./Header";
import PageContainer from "./PageContainer";

export default function AppLayout() {
  return (
    <>
      <Header />
      <PageContainer>
        <StorageWarning />
        <Outlet />
      </PageContainer>
    </>
  );
}
