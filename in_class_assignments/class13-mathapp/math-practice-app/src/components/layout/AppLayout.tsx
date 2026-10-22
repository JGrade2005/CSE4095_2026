import { Outlet } from "react-router";
import Header from "./Header";
import PageContainer from "./PageContainer";

export default function AppLayout() {
  return (
    <>
      <Header />
      <PageContainer>
        <Outlet />
      </PageContainer>
    </>
  );
}
