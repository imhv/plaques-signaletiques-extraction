"use client";

import { LayoutWrapper } from "@/components/layout-wrapper";
import { NameValidator } from "@/components/name-validator";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ValidatorPage() {
  const examples = [
    {
      brand: "WHIRLPOOL",
      productFamily: "FULLY AUTOMATIC WASHING MACHINE",
      expected: {
        brand: "Whirlpool",
        productFamily: "Washing Machine",
      },
    },
    {
      brand: "SAMSUNG",
      productFamily: "LAVE-LINGE",
      expected: {
        brand: "Samsung",
        productFamily: "Washing Machine",
      },
    },
    {
      brand: "BOSCH",
      productFamily: "LAVE-VAISSELLE",
      expected: {
        brand: "Bosch",
        productFamily: "Dishwasher",
      },
    },
    {
      brand: "LG",
      productFamily: "REFRIGERATOR",
      expected: {
        brand: "LG",
        productFamily: "Refrigerator",
      },
    },
    {
      brand: "MIELE",
      productFamily: "MICRO-ONDES",
      expected: {
        brand: "Miele",
        productFamily: "Microwave",
      },
    },
  ];

  return (
    <LayoutWrapper>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Name Validator"
          description="Test the LLM-powered brand and product family name validation system"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <NameValidator />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Try these examples to test the validation system:
                </p>
                <div className="space-y-3">
                  {examples.map((example, index) => (
                    <div key={index} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Example {index + 1}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Test Case
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Input:</span>
                          <span className="ml-2 font-mono">
                            {example.brand} / {example.productFamily}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Expected:
                          </span>
                          <span className="ml-2 font-mono">
                            {example.expected.brand} /{" "}
                            {example.expected.productFamily}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Database Matching</h4>
                  <p className="text-sm text-muted-foreground">
                    First, the system checks if the input matches any known
                    brand or product family in our comprehensive database.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">2. LLM Validation</h4>
                  <p className="text-sm text-muted-foreground">
                    If no exact match is found, an LLM analyzes the input and
                    suggests the most appropriate normalized name.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. Confidence Scoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Each validation includes a confidence score indicating how
                    certain the system is about the normalization.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">4. Fallback Handling</h4>
                  <p className="text-sm text-muted-foreground">
                    If the input cannot be confidently normalized, it's kept
                    as-is to avoid incorrect changes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Brands</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Major brands (Whirlpool, Samsung, LG)</li>
                      <li>• Premium brands (Miele, Sub-Zero)</li>
                      <li>• Budget brands (Roper, Amana)</li>
                      <li>• International brands</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Product Families</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Laundry (Washing Machine, Dryer)</li>
                      <li>• Kitchen (Refrigerator, Dishwasher)</li>
                      <li>• HVAC (Air Conditioner, Heater)</li>
                      <li>• Commercial appliances</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
