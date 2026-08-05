import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "./utils";
import HowItWorks from "@/pages/HowItWorks";
import AffiliateCommissions from "@/pages/AffiliateCommissions";
import CreatorProgram from "@/pages/CreatorProgram";

describe("prospect business education pages", () => {
  it("explains the participant value exchange and revenue model", () => {
    render(<HowItWorks />);

    expect(screen.getByRole("heading", { name: /better gifting creates value/i })).toBeInTheDocument();
    expect(screen.getByText("Four participants, each receiving something useful.")).toBeInTheDocument();
    expect(screen.getByText("Who pays whom?")).toBeInTheDocument();
  });

  it("shows who funds commission and how the example is calculated", () => {
    render(<AffiliateCommissions />);

    expect(screen.getByRole("heading", { name: /the retailer funds it/i })).toBeInTheDocument();
    expect(screen.getByText("A 20% share is not 20% of the purchase.")).toBeInTheDocument();
    expect(screen.getByText(/shopper pays the normal retail price/i)).toBeInTheDocument();
  });

  it("labels the creator program as planned and avoids earnings guarantees", () => {
    render(<CreatorProgram />);

    expect(screen.getByRole("heading", { name: /turn trusted recommendations/i })).toBeInTheDocument();
    expect(screen.getByText("Creator commission sharing is a planned program.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No earnings guarantee" })).toBeInTheDocument();
    expect(screen.getAllByText(/proposed 20%/i).length).toBeGreaterThan(0);
  });
});
